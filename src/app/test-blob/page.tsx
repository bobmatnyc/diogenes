'use client';

import type { PutBlobResult } from '@vercel/blob';
import { useState, useRef } from 'react';

export default function BlobTestPage() {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<PutBlobResult | null>(null);
  const [memoryTest, setMemoryTest] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Vercel Blob Storage Test</h1>

      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>📷 Avatar Upload Test</h2>
        <p>Your Blob Storage URL: <code>https://fjxgscisvivw4piw.public.blob.vercel-storage.com</code></p>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);

            try {
              if (!inputFileRef.current?.files) {
                throw new Error("No file selected");
              }

              const file = inputFileRef.current.files[0];

              const response = await fetch(
                `/api/avatar/upload?filename=${file.name}`,
                {
                  method: 'POST',
                  body: file,
                },
              );

              if (!response.ok) {
                throw new Error('Upload failed');
              }

              const newBlob = (await response.json()) as PutBlobResult;
              setBlob(newBlob);
            } catch (error) {
              console.error('Upload error:', error);
              alert('Upload failed: ' + (error as Error).message);
            } finally {
              setLoading(false);
            }
          }}
        >
          <input
            name="file"
            ref={inputFileRef}
            type="file"
            accept="image/jpeg, image/png, image/webp"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Uploading...' : 'Upload Avatar'}
          </button>
        </form>

        {blob && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
            <p>✅ Upload successful!</p>
            <p>Blob URL: <a href={blob.url} target="_blank" rel="noopener noreferrer">{blob.url}</a></p>
            {blob.url.includes('image') && (
              <img src={blob.url} alt="Uploaded avatar" style={{ maxWidth: '200px', marginTop: '1rem' }} />
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>🧠 Memory Storage Test</h2>
        <p>Test the memory API with Blob storage backend</p>

        <button
          onClick={async () => {
            setLoading(true);
            try {
              // Test saving a memory
              const saveResponse = await fetch('/api/memory', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-dev-mode': 'true',
                  'x-dev-user-id': 'blob-test-user'
                },
                body: JSON.stringify({
                  content: `Blob storage test at ${new Date().toISOString()}`,
                  type: 'semantic',
                  source: 'user'
                })
              });

              if (!saveResponse.ok) {
                throw new Error('Failed to save memory');
              }

              // Retrieve memories
              const getResponse = await fetch('/api/memory?limit=5', {
                headers: {
                  'x-dev-mode': 'true',
                  'x-dev-user-id': 'blob-test-user'
                }
              });

              if (!getResponse.ok) {
                throw new Error('Failed to get memories');
              }

              const result = await getResponse.json();
              setMemoryTest(result);
            } catch (error) {
              console.error('Memory test error:', error);
              alert('Memory test failed: ' + (error as Error).message);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Test Memory Storage'}
        </button>

        {memoryTest && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
            <p>✅ Memory API working!</p>
            <p>Total memories: {memoryTest.data?.memories?.length || 0}</p>
            <p>Stats: {JSON.stringify(memoryTest.data?.stats?.bySource, null, 2)}</p>
            <details>
              <summary>View memories</summary>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {JSON.stringify(memoryTest.data?.memories, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#e8f4fd', borderRadius: '8px' }}>
        <h3>ℹ️ How It Works</h3>
        <ul>
          <li><strong>Avatar Upload:</strong> Files are uploaded directly to Vercel Blob Storage using the <code>put()</code> API</li>
          <li><strong>Memory Storage:</strong> User memories are stored as JSON blobs in <code>memories/[userId].json</code></li>
          <li><strong>Persistence:</strong> All data is permanently stored in Vercel Blob Storage</li>
          <li><strong>Access:</strong> Blobs are publicly accessible via CDN URLs</li>
        </ul>

        <h3>🔧 Configuration</h3>
        <p>To enable Blob Storage in production:</p>
        <ol>
          <li>The Blob Storage is already configured (fjxgscisvivw4piw)</li>
          <li>BLOB_READ_WRITE_TOKEN is automatically available in Vercel</li>
          <li>The app automatically uses VercelBlobAdapter in production</li>
        </ol>
      </div>
    </div>
  );
}