// Mock implementation of Datacore API for testing

export interface DatacoreApi {
  query: jest.Mock;
  index: {
    on: jest.Mock;
    off: jest.Mock;
  };
}

export interface Query {
  successful: boolean;
  value?: QueryResult;
  error?: string;
}

export interface QueryResult {
  type: 'table' | 'list';
  data: any;
}

export type Literal = string | number | boolean | object | null;

export interface DataObject {
  [key: string]: Literal;
}

// Create mock Datacore API
export const createMockDatacoreApi = (): DatacoreApi => ({
  query: jest.fn().mockResolvedValue({
    successful: true,
    value: {
      type: 'table',
      data: {
        headers: ['task', 'status', 'due', 'priority'],
        values: []
      }
    }
  }),
  index: {
    on: jest.fn().mockReturnValue({ off: jest.fn() }),
    off: jest.fn()
  }
});

// Create mock query result
export const createMockQueryResult = (type: 'table' | 'list', data: any): QueryResult => ({
  type,
  data
});

// Create mock successful query
export const createMockQuery = (result: QueryResult): Query => ({
  successful: true,
  value: result
});

// Create mock failed query
export const createMockFailedQuery = (error: string): Query => ({
  successful: false,
  error
});

// Default mock implementations
export const DatacoreApi = jest.fn().mockImplementation(() => createMockDatacoreApi());

export default {
  DatacoreApi,
  createMockDatacoreApi,
  createMockQueryResult,
  createMockQuery,
  createMockFailedQuery
};