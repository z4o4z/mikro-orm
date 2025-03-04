import { EntityMetadata, type Dictionary, type EntityData } from '../typings';
import { Utils } from '../utils/Utils';
import { MetadataError } from '../errors';
import type { EntityManager } from '../EntityManager';
import { EntityHelper } from '../entity/EntityHelper';

export class MetadataStorage {

  private static readonly metadata: Dictionary<EntityMetadata> = Utils.getGlobalStorage('metadata');
  private readonly metadata: Dictionary<EntityMetadata>;

  constructor(metadata: Dictionary<EntityMetadata> = {}) {
    this.metadata = Utils.copy(metadata, false);
  }

  static getMetadata(): Dictionary<EntityMetadata>;
  static getMetadata<T = any>(entity: string, path: string): EntityMetadata<T>;
  static getMetadata<T = any>(entity?: string, path?: string): Dictionary<EntityMetadata> | EntityMetadata<T> {
    const key = entity && path ? entity + '-' + Utils.hash(path) : null;

    if (key && !MetadataStorage.metadata[key]) {
      MetadataStorage.metadata[key] = new EntityMetadata({ className: entity, path });
    }

    if (key) {
      return MetadataStorage.metadata[key];
    }

    return MetadataStorage.metadata;
  }

  static isKnownEntity(name: string): boolean {
    return !!Object.values(this.metadata).find(meta => meta.className === name);
  }

  static getMetadataFromDecorator<T = any>(target: T & Dictionary): EntityMetadata<T> {
    const path = Utils.lookupPathFromDecorator(target.name);
    const meta = MetadataStorage.getMetadata(target.name, path);
    Object.defineProperty(target, '__path', { value: path, writable: true });

    return meta;
  }

  static init(): MetadataStorage {
    return new MetadataStorage(MetadataStorage.metadata);
  }

  static clear(): void {
    Object.keys(this.metadata).forEach(k => delete this.metadata[k]);
  }

  getAll(): Dictionary<EntityMetadata> {
    return this.metadata;
  }

  getByDiscriminatorColumn<T>(meta: EntityMetadata<T>, data: EntityData<T>): EntityMetadata<T> | undefined {
    const value = data[meta.root.discriminatorColumn!];

    if (!value) {
      return undefined;
    }

    const type = meta.root.discriminatorMap![value as string];

    return this.metadata[type];
  }

  get<T = any>(entity: string, init = false, validate = true): EntityMetadata<T> {
    if (validate && !init && !this.has(entity)) {
      throw MetadataError.missingMetadata(entity);
    }

    if (init && !this.has(entity)) {
      this.metadata[entity] = new EntityMetadata();
    }

    return this.metadata[entity];
  }

  find<T = any>(entity: string): EntityMetadata<T> | undefined {
    return this.metadata[entity];
  }

  has(entity: string): boolean {
    return entity in this.metadata;
  }

  set(entity: string, meta: EntityMetadata): EntityMetadata {
    return this.metadata[entity] = meta;
  }

  reset(entity: string): void {
    delete this.metadata[entity];
  }

  decorate(em: EntityManager): void {
    Object.values(this.metadata)
      .filter(meta => meta.prototype)
      .forEach(meta => EntityHelper.decorate(meta, em));
  }

  * [Symbol.iterator](): IterableIterator<EntityMetadata> {
    for (const meta of Object.values(this.metadata)) {
      yield meta;
    }
  }

}
