import React, { useState } from 'react';
import type * as THREE from 'three';
import styles from '../JEMTreeView.module.scss';

export interface TreeNodeData {
  object: THREE.Object3D;
  label: string;
  children: TreeNodeData[];
}

interface TreeNodeProps {
  node: TreeNodeData;
  level: number;
  selectedObject: THREE.Object3D | null;
  onSelect: (object: THREE.Object3D) => void;
}

export const TreeNode: React.FC<TreeNodeProps> = ({ node, level, selectedObject, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedObject === node.object;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSelect = () => {
    onSelect(node.object);
  };

  return (
    <div className={styles.treeNode}>
      <div
        className={`${styles.nodeLabel} ${isSelected ? styles.selected : ''}`}
        style={{ paddingLeft: `${level * 16}px` }}
        onClick={handleSelect}
      >
        {hasChildren && (
          <span className={styles.expandIcon} onClick={handleToggle}>
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className={styles.expandIcon}>&nbsp;</span>}
        <span className={styles.nodeName}>{node.label}</span>
      </div>
      {hasChildren && isExpanded && (
        <div className={styles.nodeChildren}>
          {node.children.map((child, index) => (
            <TreeNode
              key={`${child.object.uuid}-${index}`}
              node={child}
              level={level + 1}
              selectedObject={selectedObject}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};
