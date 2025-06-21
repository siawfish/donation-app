"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ListTodo, Gift, Clock } from 'lucide-react'
import { FirebaseErrors } from "@/firebase/errors"
import { useAuth } from "@/firebase/auth/AuthContext"
import { firestore } from "@/firebase/auth/firebase"
import { collection, where, query, onSnapshot } from "firebase/firestore"
import { toast } from "sonner"

export function MinimalStatCards() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        listings: 0,
        pendingRequests: 0,
        donations: 0
    });

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        
        // Listings count
        const itemsQuery = query(
            collection(firestore, "items"),
            where("createdBy", "==", user.uid)
        );
        const unsubItems = onSnapshot(itemsQuery, (snapshot) => {
            setStats(prev => ({ ...prev, listings: snapshot.size }));
            setLoading(false);
        }, (error) => {
            toast.error(FirebaseErrors[error.code] || "Error fetching listings");
            setLoading(false);
        });

        // Pending requests
        const requestsQuery = query(
            collection(firestore, "requests"),
            where("createdBy", "==", user.uid),
            where("status", "==", "pending")
        );
        const unsubPending = onSnapshot(requestsQuery, (snapshot) => {
            setStats(prev => ({ ...prev, pendingRequests: snapshot.size }));
        }, (error) => {
            toast.error(FirebaseErrors[error.code] || "Error fetching requests");
        });

        // Completed donations
        const donationsQuery = query(
            collection(firestore, "requests"),
            where("donorId", "==", user.uid),
            where("status", "==", "completed")
        );
        const unsubDonations = onSnapshot(donationsQuery, (snapshot) => {
            setStats(prev => ({ ...prev, donations: snapshot.size }));
        }, (error) => {
            toast.error(FirebaseErrors[error.code] || "Error fetching donations");
        });

        return () => {
            unsubItems();
            unsubPending();
            unsubDonations();
        };
    }, [user]);

    if (loading) {
        return <MinimalStatCardsSkeleton />;
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <StatCard 
                title="My Listings" 
                value={stats.listings.toString()} 
                icon={ListTodo}
                description="Active items you've posted"
            />
            <StatCard 
                title="Pending Requests" 
                value={stats.pendingRequests.toString()} 
                icon={Clock}
                description="Awaiting responses"
            />
            <StatCard 
                title="Donations Made" 
                value={stats.donations.toString()} 
                icon={Gift}
                description="Items you've donated"
            />
        </div>
    )
}

function MinimalStatCardsSkeleton() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                    <CardHeader className="space-y-0 pb-2">
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-gray-200 rounded" />
                            <div className="h-4 bg-gray-200 rounded w-24" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-32" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function StatCard({ title, value, icon: Icon, description }: { 
    title: string, 
    value: string, 
    icon: any, 
    description: string 
}) {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
        </Card>
    )
} 