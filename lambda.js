import { handler as nodeHandler } from './handler.js';
import serverless from 'serverless-http';

export const handler = serverless(nodeHandler);
