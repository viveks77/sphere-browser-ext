import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { StorageType } from "./types";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUniqueId(url: string) : string {
  return `${url}`;
}

export function formatSessionKey(type: StorageType, key: string): `${StorageType}:${string}` {
  return `${type}:${key}`;
}