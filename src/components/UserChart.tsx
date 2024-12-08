"use client";

import React, { useEffect, useState } from "react";
import { ChartTooltipContent } from "./ui/chart";
import { ChartContainer, ChartTooltip } from "./ui/chart";
import { Legend, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { firestore } from "@/firebase/auth/firebase";
import { collection, onSnapshot, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { useAuth } from "@/firebase/auth/AuthContext";

// Define the type for our chart data
interface ChartDataPoint {
    name: string;
    requests: number;
    donations: number;
}

export default function UserChart() {
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const monthlyData = new Map<string, ChartDataPoint>();

        const updateChartData = () => {
            try {
                const sortedData = Array.from(monthlyData.values())
                    .sort((a, b) => {
                        const dateA = new Date(a.name);
                        const dateB = new Date(b.name);
                        return dateA.getTime() - dateB.getTime();
                    });

                setChartData(sortedData);
            } catch (err) {
                const error = err as Error;
                console.error("Error updating chart data:", error.message);
                setError("Error updating chart data");
            }
        };

        try {
            // Query for user's requests
            const requestsQuery = query(
                collection(firestore, "requests"),
                where("createdBy", "==", user.uid),
                orderBy("createdAt", "desc"),
                limit(6)
            );

            const unsubRequests = onSnapshot(requestsQuery,
                (snapshot) => {
                    setLoading(false);
                    try {
                        snapshot.forEach((doc) => {
                            const data = doc.data();
                            if (!data.createdAt) {
                                console.error(`Missing createdAt for request document ${doc.id}`);
                                return;
                            }

                            const date = data.createdAt instanceof Timestamp 
                                ? data.createdAt.toDate() 
                                : new Date(data.createdAt);
                            
                            const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });
                            
                            if (!monthlyData.has(monthYear)) {
                                monthlyData.set(monthYear, {
                                    name: monthYear,
                                    requests: 0,
                                    donations: 0
                                });
                            }
                            
                            const currentData = monthlyData.get(monthYear)!;
                            monthlyData.set(monthYear, {
                                ...currentData,
                                requests: currentData.requests + 1,
                                donations: currentData.donations + (data.status === "completed" ? 1 : 0)
                            });

                            updateChartData();
                        });
                    } catch (err) {
                        const error = err as Error;
                        console.error("Error processing requests data:", error.message);
                        setError("Error processing requests data");
                    }
                },
                (error) => {
                    setLoading(false);
                    console.error("Error fetching requests:", error.message);
                    setError("Error fetching requests data");
                }
            );

            return () => {
                unsubRequests();
            };
        } catch (err) {
            setLoading(false);
            const error = err as Error;
            console.error("Error setting up Firebase listeners:", error.message);
            setError("Error setting up data listeners");
        }
    }, [user]);

    if (loading) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <div className="h-7 w-64 animate-pulse rounded-md bg-muted" />
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    <div className="h-[300px] w-full space-y-4">
                        <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
                        <div className="flex justify-center space-x-4">
                            <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
                            <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Item Requests and Donations Received Trend</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="text-red-500">
                        {error}. Please try refreshing the page.
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Item Requests and Donations Received Trend</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
                <ChartContainer
                    config={{
                        requests: {
                            label: "Requests",
                            color: "hsl(var(--chart-1))",
                        },
                        donations: {
                            label: "Donations",
                            color: "hsl(var(--chart-2))",
                        },
                    }}
                    className="h-[300px] w-full"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <XAxis dataKey="name" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Line type="monotone" dataKey="requests" stroke="var(--color-requests)" activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey="donations" stroke="var(--color-donations)" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}