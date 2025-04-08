import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../../utils/logger';
import type { Mock } from 'vitest';

// Mock vscode API used by the logger
vi.mock('vscode', () => {
  // Explicitly type the mocks using the correct syntax
  const mockShowWarningMessage: Mock<(message: string) => Thenable<string | undefined>> = vi.fn();
  const mockShowErrorMessage: Mock<(message: string) => Thenable<string | undefined>> = vi.fn();
  return {
    window: {
      showWarningMessage: mockShowWarningMessage,
      showErrorMessage: mockShowErrorMessage,
    },
    _mocks: {
      mockShowWarningMessage,
      mockShowErrorMessage,
    },
  };
});

describe('Logger Utility', () => {
  // Define a more specific type for mocks using the correct syntax
  interface VsCodeMocks {
    mockShowWarningMessage: Mock<(message: string) => Thenable<string | undefined>>;
    mockShowErrorMessage: Mock<(message: string) => Thenable<string | undefined>>;
  }
  let vscodeMocks: VsCodeMocks;
  // Correctly type spies using the correct syntax
  let mockConsoleInfo: Mock<(message?: string, ...optionalParameters: unknown[]) => void>;
  let mockConsoleWarn: Mock<(message?: string, ...optionalParameters: unknown[]) => void>;
  let mockConsoleError: Mock<(message?: string, ...optionalParameters: unknown[]) => void>;

  beforeEach(async (): Promise<void> => {
    // Add return type
    // Reset mocks before each test
    vi.clearAllMocks();
    // Dynamically import the mocked module to access mocks defined inside factory
    const vscodeMocked = await import('vscode');
    // Use type assertion carefully, ensure _mocks exists and has correct type
    vscodeMocks = (vscodeMocked as unknown as { _mocks: VsCodeMocks })._mocks;
    if (!vscodeMocks?.mockShowWarningMessage || !vscodeMocks?.mockShowErrorMessage) {
      throw new Error('Failed to retrieve VS Code mocks.');
    }
    // Add checks before calling mockClear
    vscodeMocks.mockShowWarningMessage.mockClear();
    vscodeMocks.mockShowErrorMessage.mockClear();

    // Spy on console methods - Add explicit type cast for safety using correct syntax
    mockConsoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {}) as Mock<
      (message?: string, ...optionalParameters: unknown[]) => void
    >;
    mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {}) as Mock<
      (message?: string, ...optionalParameters: unknown[]) => void
    >;
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {}) as Mock<
      (message?: string, ...optionalParameters: unknown[]) => void
    >;
  });

  afterEach((): void => {
    // Add return type
    // Restore console mocks after each test - Add checks
    mockConsoleInfo.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  // --- Split tests by log level ---

  describe('logger.info', () => {
    it('should call console.log with standard message', (): void => {
      const message = 'Info test message';
      logger.info(message);
      expect(mockConsoleInfo).toHaveBeenCalledOnce();
      expect(mockConsoleInfo).toHaveBeenCalledWith(`[INFO] ${message}`);
    });

    it('should call console.log with message and params', (): void => {
      const message = 'Info with params';
      const parameters: (string | number | object)[] = [{ data: 1 }, 'more data', 123]; // Use specific types
      logger.info(message, ...parameters);
      expect(mockConsoleInfo).toHaveBeenCalledOnce();
      expect(mockConsoleInfo).toHaveBeenCalledWith(`[INFO] ${message}`, ...parameters);
    });

    it('should handle various param types', (): void => {
      const message = 'Testing types';
      const object = { a: 1 };
      const array = [1, 2];
      const function_ = vi.fn(); // Use vi.fn() instead of jest.fn()
      const nul = null;
      const undef = undefined;

      logger.info(message, object, array, function_, nul, undef);
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        `[INFO] ${message}`,
        object,
        array,
        function_,
        nul,
        undef,
      );
    });

    it('should not call VS Code messages', (): void => {
      logger.info('Simple info');
      expect(vscodeMocks.mockShowWarningMessage).not.toHaveBeenCalled();
      expect(vscodeMocks.mockShowErrorMessage).not.toHaveBeenCalled();
    });
  });

  describe('logger.warn', () => {
    it('should call console.warn and vscode.window.showWarningMessage', (): void => {
      const message = 'Warn test message';
      const parameters: number[] = [123]; // Use specific type
      logger.warn(message, ...parameters);
      expect(mockConsoleWarn).toHaveBeenCalledOnce();
      expect(mockConsoleWarn).toHaveBeenCalledWith(`[WARN] ${message}`, ...parameters);
      expect(vscodeMocks.mockShowWarningMessage).toHaveBeenCalledOnce();
      expect(vscodeMocks.mockShowWarningMessage).toHaveBeenCalledWith(message);
      expect(vscodeMocks.mockShowErrorMessage).not.toHaveBeenCalled();
    });
  });

  describe('logger.error', () => {
    it('should call console.error and vscode.window.showErrorMessage', (): void => {
      const message = 'Error test message';
      const errorObject = new Error('Something bad happened');
      logger.error(message, errorObject);
      expect(mockConsoleError).toHaveBeenCalledOnce();
      expect(mockConsoleError).toHaveBeenCalledWith(`[ERROR] ${message}`, errorObject);
      expect(vscodeMocks.mockShowErrorMessage).toHaveBeenCalledOnce();
      expect(vscodeMocks.mockShowErrorMessage).toHaveBeenCalledWith(
        `Apex Coder Error: ${message}. Check console/logs for details.`,
      );
      expect(vscodeMocks.mockShowWarningMessage).not.toHaveBeenCalled();
    });
  });
});
