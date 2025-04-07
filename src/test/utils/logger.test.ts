import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../../utils/logger';

// Mock vscode API used by the logger
vi.mock('vscode', () => {
    const mockShowWarningMessage = vi.fn();
    const mockShowErrorMessage = vi.fn();
    return {
        window: {
            showWarningMessage: mockShowWarningMessage,
            showErrorMessage: mockShowErrorMessage,
        },
        _mocks: {
            mockShowWarningMessage,
            mockShowErrorMessage
        }
    };
});

describe('Logger Utility', () => {
    let vscodeMocks: { mockShowWarningMessage: any; mockShowErrorMessage: any };
    let mockConsoleLog: ReturnType<typeof vi.spyOn>;
    let mockConsoleWarn: ReturnType<typeof vi.spyOn>;
    let mockConsoleError: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
        // Reset mocks before each test
        vi.clearAllMocks();
        // Dynamically import the mocked module to access mocks defined inside factory
        const vscodeMocked = await import('vscode');
        vscodeMocks = (vscodeMocked as any)._mocks;
        vscodeMocks.mockShowWarningMessage.mockClear();
        vscodeMocks.mockShowErrorMessage.mockClear();

        // Spy on console methods HERE, inside beforeEach
        mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
        mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore console mocks after each test
        mockConsoleLog.mockRestore();
        mockConsoleWarn.mockRestore();
        mockConsoleError.mockRestore();
    });

    it('logger.info should call console.log', () => {
        const message = 'Info test message';
        const params = [{ data: 1 }, 'more data'];
        logger.info(message, ...params);
        expect(mockConsoleLog).toHaveBeenCalledOnce();
        expect(mockConsoleLog).toHaveBeenCalledWith(`[INFO] ${message}`, ...params);
        expect(vscodeMocks.mockShowWarningMessage).not.toHaveBeenCalled();
        expect(vscodeMocks.mockShowErrorMessage).not.toHaveBeenCalled();
    });

    it('logger.warn should call console.warn and vscode.window.showWarningMessage', () => {
        const message = 'Warn test message';
        const params = [123];
        logger.warn(message, ...params);
        expect(mockConsoleWarn).toHaveBeenCalledOnce(); // Check this assertion
        expect(mockConsoleWarn).toHaveBeenCalledWith(`[WARN] ${message}`, ...params);
        expect(vscodeMocks.mockShowWarningMessage).toHaveBeenCalledOnce();
        expect(vscodeMocks.mockShowWarningMessage).toHaveBeenCalledWith(message);
        expect(vscodeMocks.mockShowErrorMessage).not.toHaveBeenCalled();
    });

    it('logger.error should call console.error and vscode.window.showErrorMessage', () => {
        const message = 'Error test message';
        const errorObj = new Error('Something bad happened');
        logger.error(message, errorObj);
        expect(mockConsoleError).toHaveBeenCalledOnce(); // Check this assertion
        expect(mockConsoleError).toHaveBeenCalledWith(`[ERROR] ${message}`, errorObj);
        expect(vscodeMocks.mockShowErrorMessage).toHaveBeenCalledOnce();
        expect(vscodeMocks.mockShowErrorMessage).toHaveBeenCalledWith(`Apex Coder Error: ${message}. Check console/logs for details.`);
        expect(vscodeMocks.mockShowWarningMessage).not.toHaveBeenCalled();
    });
});
