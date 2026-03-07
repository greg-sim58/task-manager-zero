import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MrkProduct {
    id: number;
    name: string;
    prices: {
        price: string;
        currency_code: string;
    };
}

interface MetalPrice {
    id: string;
    name: string;
    symbol: string;
    price: number;
    currency: string;
}

export function MrkPricesCard() {
    const [metalPrices, setMetalPrices] = useState<MetalPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch from Supabase Edge Function
                const { data: products, error: invokeError } = await supabase.functions.invoke<MrkProduct[]>('get-mrk-prices');

                if (invokeError) {
                    throw new Error(`Failed to fetch from Edge Function: ${invokeError.message}`);
                }

                if (!products || !Array.isArray(products)) {
                    throw new Error("Invalid response format from proxy.");
                }

                const extractedPrices: MetalPrice[] = products.map(product => {
                    const nameLower = product.name.toLowerCase();
                    let symbol = "O";
                    if (nameLower.includes("gold")) symbol = "Au";
                    else if (nameLower.includes("silver")) symbol = "Ag";
                    else if (nameLower.includes("platinum")) symbol = "Pt";
                    else if (nameLower.includes("palladium")) symbol = "Pd";
                    else symbol = product.name.substring(0, 2).toUpperCase();

                    return {
                        id: product.id.toString(),
                        name: product.name,
                        symbol,
                        price: Number(product.prices.price) / 100, // Price is in cents
                        currency: product.prices.currency_code || "ZAR"
                    };
                });

                setMetalPrices(extractedPrices);
            } catch (err) {
                console.error("Error fetching MRK prices:", err);
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchPrices();

        // Refresh prices every 5 minutes
        const interval = setInterval(fetchPrices, 300000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="hover-scale transition-all hover:shadow-lg bg-card/50 backdrop-blur w-full h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">MRK Precious Metals</CardTitle>
                <span className="text-xs text-muted-foreground">ZAR / coin</span>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center space-y-4 pt-4 pb-6">
                {loading && metalPrices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-xs">Loading MRK prices...</span>
                    </div>
                ) : error && metalPrices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 h-full text-destructive text-sm text-center">
                        <p className="font-semibold text-destructive/80">API Error</p>
                        <p className="text-xs text-muted-foreground max-w-[200px]">{error}</p>
                    </div>
                ) : metalPrices.length > 0 ? (
                    <div className="space-y-3">
                        {metalPrices.map(metal => (
                            <div key={metal.id} className="flex items-center justify-between bg-background/60 p-3 rounded-lg border border-border/80 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary shadow-inner border border-primary/20">
                                        {metal.symbol}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm leading-tight">{metal.name}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase">{metal.id}</span>
                                    </div>
                                </div>
                                <span className="font-mono font-bold text-base tracking-tight">
                                    {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: metal.currency }).format(metal.price)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm text-center">
                        Products not found on MRK store.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
