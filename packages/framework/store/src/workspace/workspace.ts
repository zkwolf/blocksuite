import { assertExists, Slot } from '@blocksuite/global/utils';
import * as Y from 'yjs';

import type { Schema } from '../schema/index.js';
import type { AwarenessStore } from '../yjs/index.js';
import { blob, indexer, test, WorkspaceAddonType } from './addon/index.js';
import { Doc } from './doc.js';
import { type DocMeta, WorkspaceMeta } from './meta.js';
import { Store, type StoreOptions } from './store.js';

export type WorkspaceOptions = StoreOptions & {
  schema: Schema;
};

@blob
@indexer
@test
export class Workspace extends WorkspaceAddonType {
  static Y = Y;
  protected _store: Store;

  protected readonly _schema: Schema;

  meta: WorkspaceMeta;

  slots = {
    docAdded: new Slot<string>(),
    docUpdated: new Slot(),
    docRemoved: new Slot<string>(),
  };

  constructor(storeOptions: WorkspaceOptions) {
    super();
    this._schema = storeOptions.schema;

    this._store = new Store(storeOptions);

    this.meta = new WorkspaceMeta(this.doc);
    this._bindDocMetaEvents();
  }

  get id() {
    return this._store.id;
  }

  get isEmpty() {
    if (this.doc.store.clients.size === 0) return true;

    let flag = false;
    if (this.doc.store.clients.size === 1) {
      const items = Array.from(this.doc.store.clients.values())[0];
      // workspaceVersion and pageVersion were set when the workspace is initialized
      if (items.length <= 2) {
        flag = true;
      }
    }
    return flag;
  }

  get store(): Store {
    return this._store;
  }

  get awarenessStore(): AwarenessStore {
    return this._store.awarenessStore;
  }

  get docs() {
    return this._store.spaces as Map<string, Doc>;
  }

  get doc() {
    return this._store.doc;
  }

  get idGenerator() {
    return this._store.idGenerator;
  }

  get schema() {
    return this._schema;
  }

  get docSync() {
    return this.store.docSync;
  }

  get awarenessSync() {
    return this.store.awarenessSync;
  }

  private _hasDoc(docId: string) {
    return this.docs.has(docId);
  }

  getDoc(docId: string): Doc | null {
    const space = this.docs.get(docId) as Doc | undefined;

    return space ?? null;
  }

  private _bindDocMetaEvents() {
    this.meta.docMetaAdded.on(docId => {
      const doc = new Doc({
        id: docId,
        workspace: this,
        doc: this.doc,
        awarenessStore: this.awarenessStore,
        idGenerator: this._store.idGenerator,
      });
      this._store.addSpace(doc);
      this.slots.docAdded.emit(doc.id);
    });

    this.meta.docMetaUpdated.on(() => this.slots.docUpdated.emit());

    this.meta.docMetaRemoved.on(id => {
      const doc = this.getDoc(id) as Doc;
      this._store.removeSpace(doc);
      doc.remove();
      this.slots.docRemoved.emit(id);
    });
  }

  /**
   * By default, only an empty doc will be created.
   * If the `init` parameter is passed, a `surface`, `note`, and `paragraph` block
   * will be created in the doc simultaneously.
   */
  createDoc(options: { id?: string } | string = {}) {
    // Migration guide
    if (typeof options === 'string') {
      options = { id: options };
      console.warn(
        '`createDoc(docId)` is deprecated, use `createDoc()` directly or `createDoc({ id: docId })` instead'
      );
      console.warn(
        'More details see https://github.com/toeverything/blocksuite/pull/2272'
      );
    }
    // End of migration guide. Remove this in the next major version

    const { id: docId = this.idGenerator() } = options;
    if (this._hasDoc(docId)) {
      throw new Error('dac already exists');
    }

    this.meta.addDocMeta({
      id: docId,
      title: '',
      createDate: +new Date(),
      tags: [],
    });
    return this.getDoc(docId) as Doc;
  }

  /** Update doc meta state. Note that this intentionally does not mutate doc state. */
  setDocMeta(
    docId: string,
    // You should not update subDocIds directly.
    props: Partial<DocMeta>
  ) {
    this.meta.setDocMeta(docId, props);
  }

  removeDoc(docId: string) {
    const docMeta = this.meta.getDocMeta(docId);
    assertExists(docMeta);

    const doc = this.getDoc(docId);
    if (!doc) return;

    doc.dispose();
    this.meta.removeDocMeta(docId);
    this._store.removeSpace(doc);
  }

  /**
   * Start the data sync process
   */
  start() {
    this.docSync.start();
    this.awarenessSync.connect();
  }

  /**
   * Verify that all data has been successfully saved to the primary storage.
   * Return true if the data transfer is complete and it is secure to terminate the synchronization operation.
   */
  canGracefulStop() {
    this.docSync.canGracefulStop();
  }

  /**
   * Wait for all data has been successfully saved to the primary storage.
   */
  waitForGracefulStop(abort?: AbortSignal) {
    return this.docSync.waitForGracefulStop(abort);
  }

  /**
   * Terminate the data sync process forcefully, which may cause data loss.
   * It is advised to invoke `canGracefulStop` before calling this method.
   */
  forceStop() {
    this.docSync.forceStop();
    this.awarenessSync.disconnect();
  }

  waitForSynced() {
    return this.docSync.waitForSynced();
  }
}
