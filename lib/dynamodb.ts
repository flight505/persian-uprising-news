import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand
} from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

// Table names from environment variables
export const TABLES = {
  ARTICLES: process.env.DYNAMODB_TABLE_ARTICLES || 'RiseUp-Articles',
  INCIDENTS: process.env.DYNAMODB_TABLE_INCIDENTS || 'RiseUp-Incidents',
  SUBSCRIPTIONS: process.env.DYNAMODB_TABLE_SUBSCRIPTIONS || 'RiseUp-Subscriptions',
};

// Generic DynamoDB operations
export async function putItem(tableName: string, item: any) {
  const command = new PutCommand({
    TableName: tableName,
    Item: item,
  });
  return docClient.send(command);
}

export async function getItem(tableName: string, key: any) {
  const command = new GetCommand({
    TableName: tableName,
    Key: key,
  });
  const response = await docClient.send(command);
  return response.Item;
}

export async function queryItems(params: {
  tableName: string;
  keyConditionExpression: string;
  expressionAttributeValues: any;
  expressionAttributeNames?: any;
  indexName?: string;
  limit?: number;
  scanIndexForward?: boolean;
  exclusiveStartKey?: any;
}) {
  const command = new QueryCommand({
    TableName: params.tableName,
    KeyConditionExpression: params.keyConditionExpression,
    ExpressionAttributeValues: params.expressionAttributeValues,
    ExpressionAttributeNames: params.expressionAttributeNames,
    IndexName: params.indexName,
    Limit: params.limit,
    ScanIndexForward: params.scanIndexForward,
    ExclusiveStartKey: params.exclusiveStartKey,
  });
  const response = await docClient.send(command);
  return {
    items: response.Items || [],
    lastEvaluatedKey: response.LastEvaluatedKey,
  };
}

export async function scanItems(params: {
  tableName: string;
  filterExpression?: string;
  expressionAttributeValues?: any;
  expressionAttributeNames?: any;
  limit?: number;
  exclusiveStartKey?: any;
}) {
  const command = new ScanCommand({
    TableName: params.tableName,
    FilterExpression: params.filterExpression,
    ExpressionAttributeValues: params.expressionAttributeValues,
    ExpressionAttributeNames: params.expressionAttributeNames,
    Limit: params.limit,
    ExclusiveStartKey: params.exclusiveStartKey,
  });
  const response = await docClient.send(command);
  return {
    items: response.Items || [],
    lastEvaluatedKey: response.LastEvaluatedKey,
  };
}

export async function updateItem(params: {
  tableName: string;
  key: any;
  updateExpression: string;
  expressionAttributeValues: any;
  expressionAttributeNames?: any;
}) {
  const command = new UpdateCommand({
    TableName: params.tableName,
    Key: params.key,
    UpdateExpression: params.updateExpression,
    ExpressionAttributeValues: params.expressionAttributeValues,
    ExpressionAttributeNames: params.expressionAttributeNames,
    ReturnValues: 'ALL_NEW',
  });
  const response = await docClient.send(command);
  return response.Attributes;
}

export async function deleteItem(tableName: string, key: any) {
  const command = new DeleteCommand({
    TableName: tableName,
    Key: key,
  });
  return docClient.send(command);
}

export async function batchWriteItems(tableName: string, items: any[]) {
  const batches = [];
  for (let i = 0; i < items.length; i += 25) {
    batches.push(items.slice(i, i + 25));
  }

  for (const batch of batches) {
    const command = new BatchWriteCommand({
      RequestItems: {
        [tableName]: batch.map(item => ({
          PutRequest: { Item: item }
        }))
      }
    });
    await docClient.send(command);
  }
}

// Article-specific operations
export async function saveArticle(article: {
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  source: 'perplexity' | 'twitter' | 'telegram';
  sourceUrl: string;
  publishedAt: number;
  tags?: string[];
  contentHash: string;
  minHash: string[];
}) {
  const id = crypto.randomUUID();
  const now = Date.now();
  const ttl = Math.floor((now + 30 * 24 * 60 * 60 * 1000) / 1000); // 30 days from now

  const item = {
    PK: `ARTICLE#${id}`,
    SK: 'METADATA',
    ...article,
    createdAt: now,
    TTL: ttl,
  };

  await putItem(TABLES.ARTICLES, item);
  return item;
}

export async function getArticleByContentHash(contentHash: string) {
  const result = await queryItems({
    tableName: TABLES.ARTICLES,
    indexName: 'contentHash-index',
    keyConditionExpression: 'contentHash = :hash',
    expressionAttributeValues: { ':hash': contentHash },
    limit: 1,
  });
  return result.items[0];
}

export async function getRecentArticles(limit: number = 20, lastKey?: any) {
  const result = await queryItems({
    tableName: TABLES.ARTICLES,
    indexName: 'publishedAt-index',
    keyConditionExpression: 'PK = :pk',
    expressionAttributeValues: { ':pk': 'ARTICLE' },
    scanIndexForward: false, // Newest first
    limit,
    exclusiveStartKey: lastKey,
  });
  return result;
}

// Incident-specific operations
export async function saveIncident(incident: {
  type: 'protest' | 'arrest' | 'injury' | 'death' | 'other';
  title: string;
  description: string;
  location: { lat: number; lon: number; address?: string };
  images?: string[];
  verified?: boolean;
  reportedBy: 'crowdsource' | 'official';
  timestamp: number;
}) {
  const id = crypto.randomUUID();
  const now = Date.now();

  const item = {
    PK: `INCIDENT#${id}`,
    SK: 'METADATA',
    verified: false,
    images: [],
    upvotes: 0,
    ...incident,
    createdAt: now,
  };

  await putItem(TABLES.INCIDENTS, item);
  return item;
}

export async function getAllIncidents(limit?: number) {
  const result = await scanItems({
    tableName: TABLES.INCIDENTS,
    limit,
  });
  return result.items;
}

export async function getIncidentsByTimeRange(startTime: number, endTime: number) {
  const result = await queryItems({
    tableName: TABLES.INCIDENTS,
    indexName: 'timestamp-index',
    keyConditionExpression: 'PK = :pk AND #ts BETWEEN :start AND :end',
    expressionAttributeValues: {
      ':pk': 'INCIDENT',
      ':start': startTime,
      ':end': endTime,
    },
    expressionAttributeNames: {
      '#ts': 'timestamp',
    },
  });
  return result.items;
}

// Subscription-specific operations
export async function saveSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}) {
  const endpointHash = await hashString(subscription.endpoint);
  const now = Date.now();

  const item = {
    PK: `SUB#${endpointHash}`,
    SK: 'METADATA',
    ...subscription,
    subscribedAt: now,
    lastNotified: now,
  };

  await putItem(TABLES.SUBSCRIPTIONS, item);
  return item;
}

export async function getAllSubscriptions() {
  const result = await scanItems({
    tableName: TABLES.SUBSCRIPTIONS,
  });
  return result.items;
}

export async function deleteSubscription(endpointHash: string) {
  await deleteItem(TABLES.SUBSCRIPTIONS, {
    PK: `SUB#${endpointHash}`,
    SK: 'METADATA',
  });
}

// Utility functions
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default docClient;
