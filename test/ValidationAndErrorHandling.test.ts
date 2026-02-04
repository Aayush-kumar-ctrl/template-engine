/*
 * Licensed under the Apache License, Version 2.0
 */

import { ValidationEngine } from '../src/ValidationEngine';
import { ErrorHandler, TemplateEngineError } from '../src/ErrorHandler';
import { DebugLogger, LogLevel } from '../src/DebugLogger';
import { ModelManager } from '@accordproject/concerto-core';

describe('ValidationEngine', () => {
    let modelManager: ModelManager;

    beforeEach(() => {
        modelManager = new ModelManager();
    });

    test('validates template structure', () => {
        const templateDom: any = {
            $class: 'org.accordproject.templatemark@0.5.0.ClauseDefinition',
            name: 'test',
            template: []
        };

        const engine = new ValidationEngine(templateDom, modelManager);
        const result = engine.validate();

        expect(result).toBeDefined();
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('detects invalid template structure', () => {
        const templateDom: any = null;

        const engine = new ValidationEngine(templateDom, modelManager);
        const result = engine.validate();

        expect(result.isValid).toBe(false);
        expect(Array.isArray(result.errors)).toBe(true);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    test('reports validation errors in readable format', () => {
        const templateDom: any = {
            $class: 'invalid.class'
        };

        const engine = new ValidationEngine(templateDom, modelManager);
        const result = engine.validate();
        const report = engine.getReport(result);

        expect(typeof report).toBe('string');
        expect(report).toMatch(/validation failed/i);
        expect(report).toMatch(/errors/i);
    });
});

describe('ErrorHandler', () => {
    test('creates detailed error messages', () => {
        const error = ErrorHandler.createError('UNDEFINED_VARIABLE', {
            variable: 'amount'
        });

        expect(error).toBeInstanceOf(TemplateEngineError);
        expect(error.code).toBe('UNDEFINED_VARIABLE');
        expect(error.message).toMatch(/amount/i);
    });

    test('wraps existing errors', () => {
        const originalError = new Error('Original error message');
        const wrappedError = ErrorHandler.wrapError(originalError, { context: 'test' });

        expect(wrappedError).toBeInstanceOf(TemplateEngineError);
        expect(wrappedError.originalError).toBe(originalError);
        expect(wrappedError.message).toContain('Original error message');
    });

    test('identifies recoverable errors', () => {
        const recoverableError = ErrorHandler.createError('UNDEFINED_VARIABLE', { variable: 'test' });
        expect(ErrorHandler.isRecoverable(recoverableError)).toBe(true);

        const nonRecoverableError = ErrorHandler.createError('TEMPLATE_COMPILATION_ERROR', {
            details: 'Syntax error'
        });
        expect(ErrorHandler.isRecoverable(nonRecoverableError)).toBe(false);
    });

    test('provides recovery suggestions', () => {
        const error = ErrorHandler.createError('UNDEFINED_VARIABLE', { variable: 'amount' });
        const suggestion = ErrorHandler.getRecoverySuggestion(error);

        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(5);
    });

    test('formats errors for logging', () => {
        const error = ErrorHandler.createError('INVALID_DATA', {
            details: 'Data is missing required fields'
        });
        const formatted = ErrorHandler.formatError(error);

        expect(formatted).toMatch(/\[INVALID_DATA\]/);
        expect(formatted).toMatch(/INVALID_DATA/);
    });
});

describe('DebugLogger', () => {
    let logger: DebugLogger;

    beforeEach(() => {
        logger = DebugLogger.getInstance(true);
        logger.clearEvents();
    });

    test('logs messages at different levels', () => {
        logger.debug('test', 'Debug message');
        logger.info('test', 'Info message');
        logger.warn('test', 'Warning message');
        logger.error('test', 'Error message');

        const events = logger.getEvents();

        expect(events).toHaveLength(4);
        expect(events[0].level).toBe(LogLevel.DEBUG);
        expect(events[3].level).toBe(LogLevel.ERROR);
    });

    test('filters events by level', () => {
        logger.debug('test', 'Debug');
        logger.warn('test', 'Warning');
        logger.error('test', 'Error');

        const errors = logger.getEventsByLevel(LogLevel.ERROR);
        expect(errors).toHaveLength(1);
        expect(errors[0].level).toBe(LogLevel.ERROR);
    });

    test('filters events by category', () => {
        logger.info('parser', 'Parse started');
        logger.info('evaluator', 'Evaluation started');
        logger.info('parser', 'Parse completed');

        const parserEvents = logger.getEventsByCategory('parser');
        expect(parserEvents).toHaveLength(2);
        expect(parserEvents.every(e => e.category === 'parser')).toBe(true);
    });

    test('logs with timing information', () => {
        const result = logger.logSync('test', 'Sync operation', () => 42);

        expect(result).toBe(42);

        const events = logger.getEvents();
        expect(events.length).toBeGreaterThanOrEqual(2);
    });

    test('generates debug report', () => {
        logger.debug('test', 'Debug message');
        logger.error('test', 'Error message');

        const report = logger.generateReport();

        expect(report).toMatch(/debug report/i);
        expect(report).toMatch(/total events/i);
        expect(report).toMatch(/errors/i);
    });
});
