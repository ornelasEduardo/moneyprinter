/** Restore has its own bounded upload path; it does not use Server Actions. */
export const MAX_RESTORE_ARCHIVE_BYTES = 20 * 1024 * 1024;
export const MAX_RESTORE_EXPANDED_BYTES = 50 * 1024 * 1024;
export const RESTORE_SIZE_DESCRIPTION = 'ZIP up to 20 MiB; expanded data up to 50 MiB';
