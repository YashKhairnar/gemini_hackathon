import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import App from "./components/App.tsx";
import "@picocss/pico/css/pico.min.css";
import "./index.css";
import {
  Repo,
  BroadcastChannelNetworkAdapter,
  IndexedDBStorageAdapter,
  DocHandle,
  isValidAutomergeUrl,
  RepoContext,
  WebSocketClientAdapter
} from "@automerge/react";
import { RootDocument } from "./rootDoc.ts";

// Dynamically determine the sync server URL based on current hostname
// This allows the app to work from different devices on the same network
const getSyncServerUrl = () => {
  // Use the current hostname (works for both localhost and network IP)
  const hostname = window.location.hostname;
  const syncPort = 3030;
  // If accessing via localhost, use localhost for sync server
  // Otherwise, use the same hostname (which will be the server's IP on the network)
  // Always use ws:// (not wss://) for local sync server since SSL isn't configured for local IPs
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "ws://localhost:3030";
  }
  // Use the same hostname as the current page, but always with ws:// protocol
  return `ws://${hostname}:${syncPort}`;
};

const syncServerUrl = getSyncServerUrl();
console.log(`🔌 Connecting to sync server at: ${syncServerUrl}`);
console.log(`📍 Current hostname: ${window.location.hostname}`);
console.log(`📍 Current URL: ${window.location.href}`);

// Create WebSocket adapter with error handling
const wsAdapter = new WebSocketClientAdapter(syncServerUrl);

// Add connection timeout
let connectionTimeout: ReturnType<typeof setTimeout>;
const CONNECTION_TIMEOUT = 10000; // 10 seconds

// Log connection events if available
if (wsAdapter && typeof (wsAdapter as any).on === 'function') {
  (wsAdapter as any).on('error', (error: Error) => {
    console.error('❌ WebSocket connection error:', error);
    console.error('   Make sure the sync server is running on port 3030');
    console.error('   Run: npm run sync-server');
  });
  (wsAdapter as any).on('open', () => {
    console.log('✅ WebSocket connected to sync server');
    if (connectionTimeout) clearTimeout(connectionTimeout);
  });
  (wsAdapter as any).on('close', () => {
    console.warn('⚠️ WebSocket disconnected from sync server');
  });
  
  // Set timeout to warn if connection takes too long
  connectionTimeout = setTimeout(() => {
    console.warn('⏱️ Sync server connection taking longer than expected...');
    console.warn('   Verify sync server is running: npm run sync-server');
    console.warn('   Check firewall settings if accessing from another device');
  }, CONNECTION_TIMEOUT);
}

const repo = new Repo({
  network: [
    new BroadcastChannelNetworkAdapter(),
    wsAdapter,
  ],
  storage: new IndexedDBStorageAdapter(),
})

// Log repo events for debugging
let peerCount = 0;
repo.networkSubsystem.on("peer", ({ peerId }: { peerId: string }) => {
  peerCount++;
  console.log(`👥 Peer connected: ${peerId} (Total: ${peerCount})`);
});
repo.networkSubsystem.on("peer-disconnected", ({ peerId }: { peerId: string }) => {
  peerCount = Math.max(0, peerCount - 1);
  console.log(`👋 Peer disconnected: ${peerId} (Total: ${peerCount})`);
});

declare global {
  interface Window {
    repo : Repo;
    handle: DocHandle<RootDocument>;
  }
}

window.repo = repo;

// Initialize root document
const initRootDocument = async () => {
  const locationHash = document.location.hash.substring(1);
  console.log('📄 Initializing root document, hash:', locationHash);
  
  // If we have a valid Automerge URL in the hash, use it
  if (isValidAutomergeUrl(locationHash)) {
    console.log('✅ Found valid Automerge URL in hash, loading document...');
    try {
      window.handle = await repo.find<RootDocument>(locationHash);
      // Ensure the document has the taskLists property initialized
      // Wait for the document to be ready, then check/initialize
      await window.handle.whenReady();
      const currentDoc = window.handle.doc();
      console.log('📄 Document loaded:', currentDoc);
      
      if (!currentDoc || !currentDoc.taskLists) {
        window.handle.change((doc) => {
          if (!doc.taskLists) {
            doc.taskLists = [];
          }
        });
      }
    } catch (error) {
      console.error('❌ Error loading document from hash:', error);
      // Fall through to create new document
      window.handle = repo.create<RootDocument>({ 
        taskLists: [],
        files: {}
      });
      window.history.replaceState(null, '', `#${window.handle.url}`);
    }
  } else {
    // Create a new root document with an empty taskLists array and files map
    console.log('📝 Creating new root document...');
    window.handle = repo.create<RootDocument>({ 
      taskLists: [],
      files: {}
    });
    // Store the document URL in hash for persistence
    // Note: This doesn't interfere with wouter routing which uses pathname, not hash
    window.history.replaceState(null, '', `#${window.handle.url}`);
    console.log('✅ Created new document:', window.handle.url);
  }
  
  // Ensure files property exists in document (for both new and existing docs)
  await window.handle.whenReady();
  const currentDoc = window.handle.doc();
  if (!currentDoc || !currentDoc.files) {
    window.handle.change((doc) => {
      if (!doc.files) {
        doc.files = {};
      }
      if (!doc.taskLists) {
        doc.taskLists = [];
      }
    });
  }
  
  console.log('✅ Root document initialized:', {
    url: window.handle.url,
    hasFiles: !!currentDoc?.files,
    fileCount: Object.keys(currentDoc?.files || {}).length
  });
};

// Initialize and render
initRootDocument().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <Suspense fallback={<div>Loading a document...</div>}>
        <RepoContext.Provider value={repo}>
          <App docUrl={window.handle.url} />
        </RepoContext.Provider>
      </Suspense>
    </React.StrictMode>,
  );
}).catch((error) => {
  console.error("Failed to initialize app:", error);
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Error Loading Application</h1>
      <p>{error.message}</p>
      <p style={{ fontSize: "0.9rem", color: "#666", marginTop: "1rem" }}>
        Check the browser console for more details.
      </p>
    </div>
  );
});
