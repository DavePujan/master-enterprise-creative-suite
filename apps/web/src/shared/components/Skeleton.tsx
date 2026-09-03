import React from 'react';
import { cn } from '@web/lib/utils.js';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("skeleton", className)} />
);
