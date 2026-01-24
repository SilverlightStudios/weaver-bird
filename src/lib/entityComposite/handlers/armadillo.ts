import type { EntityHandler, EntityHandlerResult } from "./types";
import { getSelect } from "./utils";

export const armadilloHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot, entityType } = context;

  if (
    folderRoot !== "armadillo" &&
    entityType !== "armadillo" &&
    entityType !== "armadillo_baby"
  )
    return null;

  const controls = [
    {
      kind: "select" as const,
      id: "armadillo.pose",
      label: "Pose",
      defaultValue: "unrolled",
      options: [
        { value: "unrolled", label: "Unrolled" },
        { value: "rolled", label: "Rolled Up" },
      ],
    },
  ];

  const getBoneRenderOverrides = (
    state: Parameters<NonNullable<EntityHandlerResult["getBoneRenderOverrides"]>>[0],
  ) => {
    const pose = getSelect(state, "armadillo.pose", "unrolled");
    const rolled = pose === "rolled";
    return {
      "*": { visible: !rolled },
      cube: { visible: rolled },
    };
  };

  return {
    controls,
    getBoneRenderOverrides,
  };
};
