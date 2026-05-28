"use client";

import { toast as sonnerToast } from "sonner";

export const toast = {
  error(message: string) {
    return sonnerToast.error(message);
  },
};
