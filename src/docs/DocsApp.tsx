import { useCallback, useEffect, useMemo, useState } from "react";
import type { DocRoute } from "./components/Layout/DocsLayout";
import DocsLayout from "./components/Layout/DocsLayout";
import DocsHome from "./pages/Home/DocsHome";
import UnderstandingJemModels from "./tutorials/UnderstandingJemModels/UnderstandingJemModels";
import "./styles/docs.scss";

type DocsAppProps = {
  onPathChange?: (path: string) => void;
};

const docsRoutes: DocRoute[] = [
  {
    path: "/docs/tutorials/understanding-jem-models",
    title: "Understanding JEM Models",
    category: "Tutorials",
    tagline:
      "Interactive walkthrough of how Java Entity Models render in Weaverbird. Learn coordinates, UV mapping, and bring models to life with animations.",
    accent: "#ff5c5c",
  },
  // Future tutorials can be added here:
  // {
  //     path: "/docs/tutorials/cem-animations",
  //     title: "CEM Animations",
  //     category: "Tutorials",
  //     tagline: "Master animation expressions to create walking, attacking, and idle animations for your custom entities.",
  //     accent: "#5ce1e6",
  // },
  // {
  //     path: "/docs/tutorials/texture-mapping",
  //     title: "Advanced Texture Mapping",
  //     category: "Tutorials",
  //     tagline: "Deep dive into UV coordinates, texture atlases, and per-face texture assignment.",
  //     accent: "#8b5cf6",
  // },
];

const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/";

export default function DocsApp({ onPathChange }: DocsAppProps) {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      const nextPath = window.location.pathname;
      setPathname(nextPath);
      onPathChange?.(nextPath);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [onPathChange]);

  const navigate = useCallback(
    (nextPath: string) => {
      if (nextPath === pathname) return;
      window.history.pushState({}, "", nextPath);
      setPathname(nextPath);
      onPathChange?.(nextPath);
    },
    [onPathChange, pathname],
  );

  const activeRoute = useMemo(() => {
    const normalized = normalizePath(pathname);
    return docsRoutes.find((route) => normalizePath(route.path) === normalized);
  }, [pathname]);

  // Render the appropriate page based on the route
  const renderPage = () => {
    if (!activeRoute) {
      return <DocsHome routes={docsRoutes} onNavigate={navigate} />;
    }

    // Route to the correct tutorial component
    switch (activeRoute.path) {
      case "/docs/tutorials/understanding-jem-models":
        return <UnderstandingJemModels onNavigate={navigate} />;
      default:
        return <DocsHome routes={docsRoutes} onNavigate={navigate} />;
    }
  };

  return (
    <DocsLayout
      currentPath={pathname}
      onNavigate={navigate}
      routes={docsRoutes}
    >
      {renderPage()}
    </DocsLayout>
  );
}
