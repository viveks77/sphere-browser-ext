import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { StorageType } from "./types";
import z from "zod";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUniqueId(url: string) : string {
  return `${url}`;
}

export function formatSessionKey(type: StorageType, key: string): `${StorageType}:${string}` {
  return `${type}:${key}`;
}

export function jsonSchemaToZod(jsonSchema: any): z.ZodType<any> {
  if (jsonSchema.type === 'object') {
    const shape: any = {};
    const properties = jsonSchema.properties || {};
    const required = jsonSchema.required || [];

    for (const [key, value] of Object.entries(properties)) {
      const prop = value as any;
      if (prop.type === 'string') {
        let zodString = z.string();
        if (prop.description) {
          zodString = zodString.describe(prop.description);
        }
        shape[key] = zodString;
      }
    }

    return z.object(shape);
  }
  return z.object({});
}