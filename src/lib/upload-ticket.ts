import "server-only";

import jwt from "jsonwebtoken";

import { UPLOAD_URL_TTL_SECONDS } from "@/lib/constants";
import { env } from "@/lib/env";

/**
 * Signed hand-off between `POST /api/files/upload-url` and
 * `POST /api/files/confirm`.
 *
 * The upload is a three-party dance — our API presigns, the browser PUTs
 * straight to S3, then the browser tells us it finished — and the middle step
 * is invisible to us. The ticket carries the decisions we already made
 * (which key, whose account, what display name) in a form the client cannot
 * edit, so `confirm` never has to trust a client-supplied object key.
 *
 * Size and content type are *not* taken from here either: `confirm` reads them
 * back from S3 with `HeadObject`, which is the only account of the upload that
 * cannot be fabricated.
 */

const TICKET_ISSUER = "secure-file-storage";
const TICKET_AUDIENCE = "secure-file-storage:upload";

/**
 * Outlives the presigned URL it accompanies, so a client that starts a 100 MB
 * upload just before the URL expires can still confirm it afterwards.
 */
const TICKET_TTL_SECONDS = UPLOAD_URL_TTL_SECONDS + 60 * 60;

export interface UploadTicket {
  /** S3 object key this ticket authorises. */
  key: string;
  /** Account the resulting file record belongs to. */
  ownerId: string;
  /** Sanitised display name captured when the URL was issued. */
  filename: string;
}

export function createUploadTicket(ticket: UploadTicket): string {
  return jwt.sign(ticket, env.jwtSecret, {
    algorithm: "HS256",
    expiresIn: TICKET_TTL_SECONDS,
    issuer: TICKET_ISSUER,
    audience: TICKET_AUDIENCE,
  });
}

/** Returns the ticket contents, or `null` if it is expired or not ours. */
export function verifyUploadTicket(token: string): UploadTicket | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      algorithms: ["HS256"],
      issuer: TICKET_ISSUER,
      audience: TICKET_AUDIENCE,
    }) as UploadTicket;

    if (
      typeof payload.key !== "string" ||
      typeof payload.ownerId !== "string" ||
      typeof payload.filename !== "string"
    ) {
      return null;
    }

    return {
      key: payload.key,
      ownerId: payload.ownerId,
      filename: payload.filename,
    };
  } catch {
    return null;
  }
}
