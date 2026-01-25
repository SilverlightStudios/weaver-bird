import React from 'react';
import type * as THREE from 'three';
import { TreeNode, type TreeNodeData } from './components/TreeNode';
import styles from './JEMTreeView.module.scss';

interface JEMTreeViewProps {
  rootGroup: THREE.Group;
  selectedObject: THREE.Object3D | null;
  onSelect: (object: THREE.Object3D) => void;
}

export const JEMTreeView: React.FC<JEMTreeViewProps> = ({
  rootGroup,
  selectedObject,
  onSelect,
}) => {
  const buildTreeData = (object: THREE.Object3D): TreeNodeData => {
    const children: TreeNodeData[] = [];

    // Skip single "Part_0" children - flatten them
    if (object.children.length === 1 && object.children[0].name === 'Part_0') {
      const grandChildren = object.children[0].children.map(buildTreeData);
      return {
        object,
        label: object.name || 'Unnamed',
        children: grandChildren,
      };
    }

    // Build normal hierarchy
    object.children.forEach((child) => {
      if (child.type === 'Group' || child.type === 'Mesh') {
        children.push(buildTreeData(child));
      }
    });

    return {
      object,
      label: object.name || 'Unnamed',
      children,
    };
  };

  const treeData = buildTreeData(rootGroup);

  return (
    <div className={styles.treeViewContainer}>
      <div className={styles.treeViewHeader}>Model Hierarchy</div>
      <div className={styles.treeViewContent}>
        <TreeNode
          node={treeData}
          level={0}
          selectedObject={selectedObject}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
};
