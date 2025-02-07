import type { BlockModel, Doc } from '@blocksuite/store';

export function assertFlavours(model: { flavour: string }, allowed: string[]) {
  if (!allowed.includes(model.flavour)) {
    throw new Error(`model flavour ${model.flavour} is not allowed`);
  }
}

export function matchFlavours<Key extends (keyof BlockSuite.BlockModels)[]>(
  model: BlockModel | null,
  expected: Key
): model is BlockSuite.BlockModels[Key[number]] {
  return (
    !!model && expected.includes(model.flavour as keyof BlockSuite.BlockModels)
  );
}

export function isInsideBlockByFlavour(
  doc: Doc,
  block: BlockModel | string,
  flavour: string
): boolean {
  const parent = doc.getParent(block);
  if (parent === null) {
    return false;
  }
  if (flavour === parent.flavour) {
    return true;
  }
  return isInsideBlockByFlavour(doc, parent, flavour);
}
