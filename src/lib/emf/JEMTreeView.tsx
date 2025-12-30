import React, { useState } from 'react';
import * as THREE from 'three';
import styles from './JEMTreeView.module.scss';

interface TreeNodeData {
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

const TreeNode: React.FC<TreeNodeProps> = ({ node, level, selectedObject, onSelect }) => {
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
