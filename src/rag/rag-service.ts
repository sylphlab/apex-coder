// <!-- Version: 1.1 | Last Updated: 2025-07-08 -->

import * as vscode from 'vscode';
// Use the new recommended package
import { connect, type Connection, type VectorStore } from '@lancedb/lancedb';
// Using transformers.js for local embeddings
import { pipeline, type Pipeline } from '@xenova/transformers';
import { logger } from '../utils/logger.js';
import * as path from 'node:path';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

// --- Constants & Configuration ---
const DB_PATH = '.apex-coder/lancedb';
const TABLE_NAME = 'workspace_index';
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

// --- Interfaces ---
export interface DocumentChunk {
  text: string;
  metadata: {
    filePath: string;
    startLine: number;
  };
}

// --- Singleton Instances (Lazy Loaded) ---
let databaseConnection: Connection | null;
let embeddingPipeline: Pipeline | null;
let table: VectorStore | null;

// --- Helper Functions ---

async function getDatabaseConnection(): Promise<Connection> {
  // ... (implementation remains the same, uses connect from @lancedb/lancedb)
  if (!databaseConnection) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
      throw new Error('Cannot initialize LanceDB: No workspace folder open.');
    }
    const rootUri = workspaceFolders[0].uri;
    const databaseUri = vscode.Uri.joinPath(rootUri, DB_PATH);
    try {
      await vscode.workspace.fs.createDirectory(databaseUri);
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code !== 'EntryExists') {
        logger.error('Failed to create LanceDB directory:', error);
        throw new Error(`Failed to create LanceDB directory: ${databaseUri.fsPath}`);
      }
    }
    logger.info(`Connecting to LanceDB at: ${databaseUri.fsPath}`);
    databaseConnection = await connect(databaseUri.fsPath);
  }
  return databaseConnection;
}

// Choose ONE embedding strategy
// Strategy 1: Transformers.js (local)
async function getTransformerEmbeddingPipeline(): Promise<Pipeline> {
  // ... (implementation remains the same)
  if (!embeddingPipeline) {
    logger.info(`Loading embedding model: ${EMBEDDING_MODEL}`);
    embeddingPipeline = await pipeline('feature-extraction', EMBEDDING_MODEL);
    logger.info('Embedding model loaded.');
  }
  return embeddingPipeline;
}

// Adapt getVectorTable to use chosen strategy
async function getVectorTable(): Promise<VectorStore> {
  if (!table) {
    const conn = await getDatabaseConnection();

    // *** Use Transformers.js Strategy ***
    const embedPipeline = await getTransformerEmbeddingPipeline();
    const embeddingFunction = {
      sourceColumn: 'text',
      embed: async (batch: string[]): Promise<number[][]> => {
        const output = await embedPipeline(batch, { pooling: 'mean', normalize: true });
        return output.tolist();
      },
    };
    // *********************************

    try {
      logger.info(`Attempting to open LanceDB table: ${TABLE_NAME}`);
      // Use the generic VectorStore type from @lancedb/lancedb
      table = await conn.openTable(TABLE_NAME, embeddingFunction);
      logger.info(`Opened existing LanceDB table: ${TABLE_NAME}`);
    } catch {
      logger.warn(`Table ${TABLE_NAME} not found, attempting to create...`);
      try {
        // Re-run dummy embedding to get dimensions if using Transformers.js
        const embedPipelineForDim = await getTransformerEmbeddingPipeline();
        const dummyEmbedding = await embedPipelineForDim('test', {
          pooling: 'mean',
          normalize: true,
        });
        const dimensions = dummyEmbedding.dims[1];
        if (!dimensions) throw new Error('Could not determine embedding dimensions');
        logger.info(`Embedding dimensions: ${dimensions}`);

        // Use LanceDBVectorStore for creation if using Langchain embeddings, or generic create otherwise
        const dummyData = [
          {
            vector: new Array(dimensions).fill(0.1),
            text: 'dummy',
            filePath: 'dummy/path',
            startLine: 0,
          },
        ];
        // Use generic createTable with schema inference
        table = await conn.createTable(TABLE_NAME, dummyData);
        logger.info(`Created new LanceDB table (schema inferred): ${TABLE_NAME}`);
        // Re-open with embedding function after creation
        table = await conn.openTable(TABLE_NAME, embeddingFunction);
      } catch (createError) {
        logger.error('Failed to create LanceDB table:', createError);
        throw new Error(`Failed to create LanceDB table: ${TABLE_NAME}`);
      }
    }
  }
  return table;
}

// --- Core Service Functions ---

export async function indexWorkspace(): Promise<void> {
  logger.info('Starting workspace indexing...');

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    throw new Error('Cannot index workspace: No workspace folder open.');
  }

  const rootUri = workspaceFolders[0].uri;

  try {
    // Get or create the vector table
    const vectorTable = await getVectorTable();

    // Clear existing data
    await clearIndex();

    // Get all workspace files
    const files = await vscode.workspace.findFiles(
      '**/*.{js,ts,jsx,tsx,vue,html,css,md,json}',
      '**/node_modules/**',
    );

    logger.info(`Found ${files.length} files to index.`);

    // Process files in batches to avoid memory issues
    const batchSize = 10;
    for (let batchIndex = 0; batchIndex < files.length; batchIndex += batchSize) {
      const batch = files.slice(batchIndex, batchIndex + batchSize);
      const batchPromises = batch.map(async (fileUri) => {
        try {
          const content = await vscode.workspace.fs.readFile(fileUri);
          const text = new TextDecoder().decode(content);

          // Skip empty files
          if (!text.trim()) {
            return [];
          }

          // Split text into chunks
          const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: CHUNK_SIZE,
            chunkOverlap: CHUNK_OVERLAP,
          });

          const chunks = await splitter.createDocuments([text]);

          const relativePath = path.relative(rootUri.fsPath, fileUri.fsPath);

          return chunks.map((chunk) => {
            // Find the start line by counting newlines before this chunk
            const chunkStartIndex = text.indexOf(chunk.pageContent);
            const textBeforeChunk = text.slice(0, Math.max(0, chunkStartIndex));
            const startLine = textBeforeChunk.split('\n').length - 1;

            return {
              text: chunk.pageContent,
              filePath: relativePath,
              startLine,
            };
          });
        } catch (error) {
          logger.error(`Error processing file ${fileUri.fsPath}:`, error);
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const flatResults = batchResults.flat();

      if (flatResults.length > 0) {
        // Add chunks to the vector table
        await vectorTable.add(flatResults);
        logger.info(
          `Indexed ${flatResults.length} chunks from batch ${batchIndex / batchSize + 1}/${Math.ceil(files.length / batchSize)}`,
        );
      }
    }

    logger.info('Workspace indexing completed successfully.');
  } catch (error) {
    logger.error('Error during workspace indexing:', error);
    throw new Error(
      `Failed to index workspace: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function searchWorkspace(query: string, k = 5): Promise<DocumentChunk[]> {
  logger.info(`Searching workspace for: "${query}" (k=${k})`);
  if (!query) return [];

  try {
    const vectorTable = await getVectorTable();
    // LanceDB search API might differ slightly, check docs
    // Assuming generic search method exists
    const results = await vectorTable.search(query).limit(k).execute();

    logger.info(`Found ${results.length} results.`);

    // Define proper type for search results
    interface SearchResult {
      text: string;
      filePath: string;
      startLine: number;
      payload?: {
        text: string;
        filePath: string;
        startLine: number;
      };
    }

    return results.map((result: SearchResult) => ({
      text: result.text || result.payload?.text || 'Error: Text not found',
      metadata: {
        filePath: result.filePath || result.payload?.filePath || 'N/A',
        startLine: result.startLine || result.payload?.startLine || 0,
      },
    }));
  } catch (error) {
    logger.error('Error during workspace search:', error);
    return [];
  }
}
export async function clearIndex(): Promise<void> {
  logger.info('Clearing workspace index...');

  try {
    const conn = await getDatabaseConnection();

    try {
      // Check if table exists before attempting to drop
      const tableExists = await conn.tableExists(TABLE_NAME);

      if (tableExists) {
        await conn.dropTable(TABLE_NAME);
        logger.info(`Dropped table: ${TABLE_NAME}`);
      } else {
        logger.info(`Table ${TABLE_NAME} does not exist, nothing to clear.`);
      }
    } catch (error) {
      logger.error('Error clearing workspace index:', error);
      throw new Error(
        `Failed to clear workspace index: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } catch (error) {
    logger.error('Error connecting to database:', error);
    throw new Error(
      `Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
