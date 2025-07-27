// Jest setup file for Obsidian plugin testing

import 'jest';
import '@testing-library/jest-dom';

// Global test configuration
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidTask(): R;
      toHaveValidTaskStructure(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidTask(received: any) {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.text === 'string' &&
      Array.isArray(received.tags) &&
      typeof received.completed === 'boolean';

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid task`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid task with id, text, tags, and completed properties`,
        pass: false,
      };
    }
  },

  toHaveValidTaskStructure(received: any) {
    const requiredFields = ['id', 'text', 'file', 'line', 'tags', 'status', 'completed'];
    const missingFields = requiredFields.filter(field => !(field in received));

    if (missingFields.length === 0) {
      return {
        message: () => `expected ${received} not to have valid task structure`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have valid task structure, missing fields: ${missingFields.join(', ')}`,
        pass: false,
      };
    }
  }
});

// Mock DOM globals that might be needed
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Enhance HTMLElement prototype with Obsidian-specific methods
HTMLElement.prototype.empty = jest.fn(function(this: HTMLElement) {
  while (this.firstChild) {
    this.removeChild(this.firstChild);
  }
});

HTMLElement.prototype.addClass = jest.fn(function(this: HTMLElement, className: string) {
  this.classList.add(className);
});

HTMLElement.prototype.removeClass = jest.fn(function(this: HTMLElement, className: string) {
  this.classList.remove(className);
});

HTMLElement.prototype.hasClass = jest.fn(function(this: HTMLElement, className: string) {
  return this.classList.contains(className);
});

HTMLElement.prototype.toggleClass = jest.fn(function(this: HTMLElement, className: string, force?: boolean) {
  if (force !== undefined) {
    return this.classList.toggle(className, force);
  }
  return this.classList.toggle(className);
});

HTMLElement.prototype.createEl = jest.fn(function(this: HTMLElement, tagName: string, attrs?: any) {
  const el = document.createElement(tagName);
  if (attrs) {
    Object.assign(el, attrs);
    if (attrs.cls) el.className = attrs.cls;
    if (attrs.text) el.textContent = attrs.text;
  }
  this.appendChild(el);
  return el;
});

HTMLElement.prototype.createDiv = jest.fn(function(this: HTMLElement, attrs?: any) {
  return this.createEl('div', attrs);
});

HTMLElement.prototype.createSpan = jest.fn(function(this: HTMLElement, attrs?: any) {
  return this.createEl('span', attrs);
});

HTMLElement.prototype.setText = jest.fn(function(this: HTMLElement, text: string) {
  this.textContent = text;
});

HTMLElement.prototype.setAttr = jest.fn(function(this: HTMLElement, attr: string, value: string) {
  this.setAttribute(attr, value);
});

// Add drag and drop event types
HTMLElement.prototype.addEventListener = jest.fn(function(this: HTMLElement, type: string, listener: any) {
  // Mock implementation for drag events
});

HTMLElement.prototype.removeEventListener = jest.fn(function(this: HTMLElement, type: string, listener: any) {
  // Mock implementation
});

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});