---
id: direct-to-object-storage-uploads
title: Direct-to-object-storage file uploads
description: Use when designing or reviewing large file uploads, presigned upload URLs, or an API that proxies file bytes to object storage
kind: practice
review: unreviewed
reviewed: 2026-11-13
sources:
  - kind: file
    ref: "User-provided screenshots for the Katabench case Upload Directly to Storage"
  - kind: web-address
    ref: https://katabench.com/blog/design-a-file-storage-service
  - kind: web-address
    ref: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
  - kind: web-address
    ref: https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html
triggers:
  prompt: [file upload, direct upload, upload proxy, signed upload URL, presigned upload URL]
---

## Digest

Direct-to-storage uploads keep large, slow transfers off the API's network connection. The API authenticates the uploader, authorizes the file upload, records it as pending, and returns a short-lived signed URL scoped to the intended upload operation and object key. The browser sends the bytes to storage. The API verifies the stored object against the pending record before marking the file ready. If a grant permits repeated writes, ready records must keep referring to the bytes that passed verification. Proxying can suit small files and enables inspection in transit.

## KB-UPLOAD-1 Direct upload (case A)

The browser requests an upload URL. After authenticating and authorizing the uploader, the API creates a pending file record in the metadata database (PostgreSQL in the case) and returns the signed URL. The browser uses it to send the bytes directly to object storage (Amazon S3 in the case).

## KB-UPLOAD-2 Signed URL scope

The signed URL expires quickly and grants only the intended upload operation on the reserved object key. An S3 presigned PUT URL can be reused until expiry. A later PUT can replace the object at that key.

## KB-UPLOAD-3 Readiness

A file becomes ready only after the API checks the object in storage against the pending file record. For an S3 flow that reads by key, a conditional PUT with `If-None-Match: *` prevents an upload from replacing an existing object. The upload path must enforce that condition to keep a still-valid URL from changing the verified bytes.

## KB-UPLOAD-4 API-proxied upload (case B)

The API streams bytes from the browser to storage. Streaming can keep memory use low while using the API's connection and bandwidth for the entire upload. The proxy can inspect bytes as they pass through and can be acceptable for small files.
