// <!-- Version: 1.1 | Last Updated: 2025-07-08 -->

import * as vscode from 'vscode';
// Use the new recommended package
import { connect, type Connection, type VectorStore } from '@lancedb/lancedb';
import { LanceDBVectorStore } from "@langchain/community/vectorstores/lancedb"; // Import specific class if needed
import { OpenAIEmbeddings } from "@langchain/openai"; // Example using OpenAI embeddings via langchain
// Or keep using transformers.js
import { pipeline, type Pipeline } from '@xenova/transformers';
import { logger } from '../utils/logger';
// ... (keep other imports: path, RecursiveCharacterTextSplitter) ...

// --- Constants & Configuration ---
// ... (keep constants) ...

// --- Interfaces ---
// ... (keep interfaces) ...

// --- Singleton Instances (Lazy Loaded) ---
let dbConnection: Connection | null = null;
let embeddingPipeline: Pipeline | null = null; // For Transformers.js
let embeddings: OpenAIEmbeddings | null = null; // For Langchain/OpenAI
let table: VectorStore | null = null; // Use generic VectorStore type from @lancedb/lancedb

// --- Helper Functions ---

async function getDbConnection(): Promise<Connection> {
// ... (implementation remains the same, uses connect from @lancedb/lancedb)
    if (!dbConnection) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders?.length) {
            throw new Error("Cannot initialize LanceDB: No workspace folder open.");
        }
        const rootUri = workspaceFolders[0].uri;
        const dbUri = vscode.Uri.joinPath(rootUri, DB_PATH);
        try {
            await vscode.workspace.fs.createDirectory(dbUri);
        } catch (error: any) {
            if (error?.code !== 'EntryExists') {
                logger.error("Failed to create LanceDB directory:", error);
                throw new Error(`Failed to create LanceDB directory: ${dbUri.fsPath}`);
            }
        }
        logger.info(`Connecting to LanceDB at: ${dbUri.fsPath}`);
        dbConnection = await connect(dbUri.fsPath);
    }
    return dbConnection;
}

// Choose ONE embedding strategy
// Strategy 1: Transformers.js (local)
async function getTransformerEmbeddingPipeline(): Promise<Pipeline> {
// ... (implementation remains the same)
    if (!embeddingPipeline) {
        logger.info(`Loading embedding model: ${EMBEDDING_MODEL}`);
        embeddingPipeline = await pipeline('feature-extraction', EMBEDDING_MODEL);
        logger.info("Embedding model loaded.");
    }
    return embeddingPipeline;
}

// Strategy 2: Langchain + OpenAI (requires API Key setup)
// async function getOpenAIEmbeddings(): Promise<OpenAIEmbeddings> {
//     if (!embeddings) {
//         // TODO: Securely get OpenAI API key from config/secrets
//         const apiKey = process.env.OPENAI_API_KEY; // Replace with actual key retrieval
//         if (!apiKey) throw new Error("OpenAI API Key not configured for RAG embeddings.");
//         embeddings = new OpenAIEmbeddings({ openAIApiKey: apiKey });
//         logger.info("OpenAI Embeddings initialized.");
//     }
//     return embeddings;
// }

// Adapt getVectorTable to use chosen strategy
async function getVectorTable(): Promise<VectorStore> {
    if (!table) {
        const conn = await getDbConnection();

        // *** Use Transformers.js Strategy ***
        const embedPipeline = await getTransformerEmbeddingPipeline();
        const embeddingFunction = {
            sourceColumn: 'text',
            embed: async (batch: string[]): Promise<number[][]> => {
                const output = await embedPipeline(batch, { pooling: 'mean', normalize: true });
                return output.tolist();
            }
        };
        // *********************************

        // *** OR Use Langchain/OpenAI Strategy ***
        // const lcEmbeddings = await getOpenAIEmbeddings();
        // const embeddingFunction = {
        //     sourceColumn: 'text',
        //     embed: async (batch: string[]) => {
        //         return await lcEmbeddings.embedDocuments(batch);
        //     }
        // };
        // ***********************************

        try {
            logger.info(`Attempting to open LanceDB table: ${TABLE_NAME}`);
            // Use the generic VectorStore type from @lancedb/lancedb
            table = await conn.openTable(TABLE_NAME, embeddingFunction);
            logger.info(`Opened existing LanceDB table: ${TABLE_NAME}`);
        } catch (error) {
            logger.warn(`Table ${TABLE_NAME} not found, attempting to create...`);
            try {
                // Re-run dummy embedding to get dimensions if using Transformers.js
                const embedPipelineForDim = await getTransformerEmbeddingPipeline();
                const dummyEmbedding = await embedPipelineForDim('test', { pooling: 'mean', normalize: true });
                const dimensions = dummyEmbedding.dims[1];
                if (!dimensions) throw new Error("Could not determine embedding dimensions");
                logger.info(`Embedding dimensions: ${dimensions}`);

                // Use LanceDBVectorStore for creation if using Langchain embeddings, or generic create otherwise
                 const dummyData = [{
                    vector: Array(dimensions).fill(0.1),
                    text: 'dummy',
                    filePath: 'dummy/path',
                    startLine: 0
                 }];
                 // Use generic createTable with schema inference
                 table = await conn.createTable(TABLE_NAME, dummyData );
                 logger.info(`Created new LanceDB table (schema inferred): ${TABLE_NAME}`);
                 // Re-open with embedding function after creation
                 table = await conn.openTable(TABLE_NAME, embeddingFunction);

            } catch (createError) {
                logger.error("Failed to create LanceDB table:", createError);
                throw new Error(`Failed to create LanceDB table: ${TABLE_NAME}`);
            }
        }
    }
    return table;
}

// --- Core Service Functions ---

// ... (indexWorkspace implementation mostly the same, ensure it uses getVectorTable)

export async function searchWorkspace(
    query: string,
    k = 5
): Promise<DocumentChunk[]> {
    logger.info(`Searching workspace for: "${query}" (k=${k})`);
    if (!query) return [];

    try {
        const vectorTable = await getVectorTable();
        // LanceDB search API might differ slightly, check docs
        // Assuming generic search method exists
        const results = await vectorTable.search(query).limit(k).execute();

        logger.info(`Found ${results.length} results.`);

        // Format results (adjust based on actual result structure)
        // The generic VectorStore might return results differently
        return results.map((result: any) => ({ // Use any temporarily
            text: result.text || result.payload?.text || 'Error: Text not found', // Adapt field access
            metadata: {
                filePath: result.filePath || result.payload?.filePath || 'N/A',
                startLine: result.startLine || result.payload?.startLine || 0,
            },
            // score: result._distance // Adjust score field if needed
        }));

    } catch (error) {
        logger.error("Error during workspace search:", error);
        return [];
    }
}

// ... (clearIndex implementation mostly the same, uses getDbConnection) 