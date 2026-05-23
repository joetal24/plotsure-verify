import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PlotSureLogo from "@/components/PlotSureLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, ShieldCheck, FileCheck, ArrowRight, Satellite, Network } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "PS ◇ PlotSure";
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <PlotSureLogo />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/login")}>Login</Button>
            <Button onClick={() => navigate("/login")}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-primary py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-mid opacity-90" />
        <div className="container relative z-10 text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 max-w-4xl mx-auto leading-tight">
            Verify Land. Detect Fraud. Trust the Price.
          </h1>
          <p className="text-primary-foreground/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-body">
            PlotSure uses AI, GIS spatial analysis, and graph-based fraud detection to help Ugandans transact land with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" onClick={() => navigate("/login")} className="text-base">
              <MapPin className="mr-2 h-5 w-5" /> Start a Land Search
            </Button>
            <Button size="lg" variant="outline" className="text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
              How It Works <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: <Satellite className="h-8 w-8 text-primary-mid" />,
                title: "GIS Price Intelligence",
                desc: "AI price prediction enriched with satellite remote sensing, road proximity, building density, and land cover classification.",
              },
              {
                icon: <Network className="h-8 w-8 text-warning" />,
                title: "Graph Fraud Detection",
                desc: "Neo4j graph-based ownership risk scanner with ML anomaly detection identifies suspicious transaction patterns.",
              },
            ].map((f, i) => (
              <Card key={i} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="mb-4 p-3 bg-accent rounded-lg w-fit">{f.icon}</div>
                  <h3 className="text-lg font-bold mb-2 font-display">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed font-body">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 bg-accent/50">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid w-full grid-cols-1 md:grid-cols-3 gap-8 justify-center justify-items-center max-w-5xl mx-auto">
            {[
              { step: 1, title: "Enter Plot Details", desc: "Enter plot title number or parcel details" },
              { step: 2, title: "Receive AI Analysis", desc: "Receive AI price estimate, GIS spatial analysis, and fraud risk score" },
              { step: 3, title: "Download Certificate", desc: "Download your signed PDF verification certificate" },
            ].map(s => (
              <div key={s.step} className="text-center w-full max-w-xs">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-bold mb-2 font-display">{s.title}</h3>
                <p className="text-sm text-muted-foreground font-body">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-card">
        <div className="container text-center text-sm text-muted-foreground font-body">
          PlotSure | ISBAT University Research Project | Kampala, Uganda | 2026
        </div>
      </footer>
    </div>
  );
};

export default Landing;
