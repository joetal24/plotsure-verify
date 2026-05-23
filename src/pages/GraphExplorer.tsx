import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import cytoscape, { type Core, type EventObject } from "cytoscape";
import { useAuth } from "@/contexts/AuthContext";
import AppTopBar from "@/components/AppTopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { fetchOwnershipChain, fetchPersonPlots } from "@/lib/api";
import { Search, Loader2, MapPin, User, Info, ExternalLink } from "lucide-react";

const personColor = "#16a34a";
const plotColor = "#1e3a6e";

const cyStyles: cytoscape.Stylesheet[] = [
  {
    selector: 'node[type="person"]',
    style: {
      shape: "ellipse",
      "background-color": personColor,
      width: 60,
      height: 60,
      label: "data(label)",
      color: "#1e293b",
      "font-size": "11px",
      "text-valign": "bottom",
      "text-halign": "center",
      "padding-top": "8px",
      "border-color": "#15803d",
      "border-width": 2,
    },
  },
  {
    selector: 'node[type="plot"]',
    style: {
      shape: "round-rectangle",
      "background-color": plotColor,
      width: 90,
      height: 44,
      label: "data(label)",
      color: "#ffffff",
      "font-size": "11px",
      "font-weight": "bold",
      "text-valign": "center",
      "text-halign": "center",
      "border-color": "#152c52",
      "border-width": 2,
    },
  },
  {
    selector: "node.highlighted",
    style: {
      "border-color": "#f59e0b",
      "border-width": 4,
      "border-opacity": 1,
    },
  },
  {
    selector: "node.dimmed",
    style: { opacity: 0.3 },
  },
  {
    selector: "edge",
    style: {
      width: 2,
      "line-color": "#94a3b8",
      "target-arrow-color": "#94a3b8",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      label: "data(label)",
      "font-size": "9px",
      color: "#64748b",
      "text-margin-y": "-4px",
    },
  },
  {
    selector: "edge.dimmed",
    style: { opacity: 0.15 },
  },
];

const GraphExplorer = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [query, setQuery] = useState(searchParams.get("ref") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    label: string;
    type: "person" | "plot";
    details?: string;
  } | null>(null);

  // Initialize Cytoscape once
  useEffect(() => {
    if (!containerRef.current || cyRef.current) return;
    cyRef.current = cytoscape({
      container: containerRef.current,
      style: cyStyles,
      layout: { name: "grid" },
      minZoom: 0.5,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    cyRef.current.on("tap", "node", (evt: EventObject) => {
      const node = evt.target;
      const type = node.data("type") as "person" | "plot";
      const label = node.data("label") as string;
      const id = node.id();
      setSelectedNode({ id, label, type });

      // Highlight connected
      cyRef.current?.elements().difference(node.connectedEdges().connectedNodes().add(node)).addClass("dimmed");
      node.connectedEdges().connectedNodes().removeClass("dimmed");
      node.removeClass("dimmed");
      node.connectedEdges().removeClass("dimmed");
    });

    cyRef.current.on("tap", (evt: EventObject) => {
      if (evt.target === cyRef.current) {
        setSelectedNode(null);
        cyRef.current?.elements().removeClass("dimmed");
      }
    });

    cyRef.current.on("dblclick", "node", async (evt: EventObject) => {
      const node = evt.target;
      const type = node.data("type") as string;
      const label = node.data("label") as string;
      if (type === "person") {
        await expandPerson(label);
      } else {
        await searchPlot(label);
      }
    });

    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, []);

  const renderGraph = useCallback(
    (elements: cytoscape.ElementDefinition[], animate = true) => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.elements().remove();
      if (elements.length > 0) {
        cy.add(elements);
        cy.layout({ name: "cose", animate, animationDuration: 400, fit: true, padding: 40 }).run();
      }
      setSelectedNode(null);
    },
    []
  );

  const addToGraph = useCallback(
    (elements: cytoscape.ElementDefinition[]) => {
      const cy = cyRef.current;
      if (!cy) return;
      const existingIds = new Set(cy.nodes().map((n) => n.id()));
      const newEls = elements.filter((el) => !existingIds.has(el.data.id));
      if (newEls.length > 0) {
        cy.add(newEls);
        cy.layout({ name: "cose", animate: true, animationDuration: 400, fit: true, padding: 40 }).run();
      }
    },
    []
  );

  const searchPlot = async (ref?: string) => {
    const plotRef = ref || query.trim();
    if (!plotRef) return;
    setLoading(true);
    setError("");
    setSelectedNode(null);
    try {
      const data = await fetchOwnershipChain(plotRef);
      const elements: cytoscape.ElementDefinition[] = [
        ...data.nodes.map((n) => ({ data: n.data, group: "nodes" as const })),
        ...data.edges.map((e) => ({ data: e.data, group: "edges" as const })),
      ];
      renderGraph(elements);
      // Update URL
      setSearchParams({ ref: plotRef }, { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to load ownership graph");
    } finally {
      setLoading(false);
    }
  };

  const expandPerson = async (name: string) => {
    setLoading(true);
    try {
      const data = await fetchPersonPlots(name);
      const elements: cytoscape.ElementDefinition[] = [
        ...data.nodes.map((n) => ({ data: n.data, group: "nodes" as const })),
        ...data.edges.map((e) => ({ data: e.data, group: "edges" as const })),
      ];
      addToGraph(elements);
    } catch {
      // Silently fail on expand
    } finally {
      setLoading(false);
    }
  };

  // Auto-search on mount if ?ref= is in URL
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && !cyRef.current?.elements().length) {
      setQuery(ref);
      searchPlot(ref);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") searchPlot();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppTopBar />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">Ownership Graph</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Explore land title ownership chains — double-click any node to expand
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter plot reference (e.g. VOL_123_FOL_456)"
              className="pl-9"
            />
          </div>
          <Button onClick={() => searchPlot()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            Explore
          </Button>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Graph + Side panel */}
        <div className="flex gap-4">
          {/* Graph container */}
          <div className="relative flex-1">
            <div
              ref={containerRef}
              className="h-[600px] rounded-xl border bg-white overflow-hidden"
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {/* Legend */}
            <div className="absolute bottom-4 right-4 flex items-center gap-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm shadow">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: personColor }} />
                <span className="text-xs font-medium text-gray-700">Person</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: plotColor }} />
                <span className="text-xs font-medium text-gray-700">Plot</span>
              </div>
            </div>
          </div>

          {/* Detail panel */}
          {selectedNode && (
            <Card className="w-72 shrink-0 self-start">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  {selectedNode.type === "person" ? (
                    <User className="h-4 w-4 text-green-600" />
                  ) : (
                    <MapPin className="h-4 w-4 text-blue-800" />
                  )}
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {selectedNode.type}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-sm break-all">{selectedNode.label}</p>
                </div>
                <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                  <p className="flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Double-click to expand
                  </p>
                  {selectedNode.type === "person" && (
                    <p className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Shows all plots this person owned
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Empty state */}
        {!loading && !cyRef.current?.elements().length && !error && (
          <div className="text-center py-16">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">
              Enter a plot reference above to explore its ownership history
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Double-click person nodes to see all plots they've owned
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default GraphExplorer;
