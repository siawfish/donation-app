"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ListTodo, Clock, Gift, Users, Eye, Heart } from 'lucide-react'
import { FirebaseErrors } from "@/firebase/errors"
import { useAuth } from "@/firebase/auth/AuthContext"
import { firestore } from "@/firebase/auth/firebase"
import { collection, where, query, onSnapshot, orderBy } from "firebase/firestore"
import { toast } from "sonner"

export default function StatCards() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        listings: 0,
        pendingRequests: 0,
        donations: 0,
        donors: 0,
        beneficiaries: 0,
        views: 0,
        wishlists: 0
    });

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        let unsubItems: () => void;
        let unsubViews: () => void;
        let unsubWishlist: () => void;
        // Listings count (for donors)
        const itemsQuery = query(
            collection(firestore, "items"),
            where("createdBy", "==", user.uid)
        );
        unsubItems = onSnapshot(itemsQuery, (snapshot) => {
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
            setLoading(false);
        }, (error) => {
            toast.error(FirebaseErrors[error.code] || "Error fetching requests");
            setLoading(false);
        });

        // Completed donations
        const donationsQuery = query(
            collection(firestore, "requests"),
            where("donorId", "==", user.uid),
            where("status", "==", "completed")
        );
        const unsubDonations = onSnapshot(donationsQuery, (snapshot) => {
            setStats(prev => ({ ...prev, donations: snapshot.size }));
            setLoading(false);
        }, (error) => {
            toast.error(FirebaseErrors[error.code] || "Error fetching donations");
            setLoading(false);
        });

        // Unique donors/beneficiaries
        const uniqueUsersQuery = query(
            collection(firestore, "requests"),
            where("createdBy", "==", user.uid)
        );
        const unsubUsers = onSnapshot(uniqueUsersQuery, (snapshot) => {
            const uniqueUsers = new Set();
            snapshot.forEach(doc => {
                uniqueUsers.add(doc.data().createdBy);
            });
            setStats(prev => ({ ...prev, beneficiaries: uniqueUsers.size }));
            setStats(prev => ({ ...prev, donors: uniqueUsers.size }));
            setLoading(false);
        }, (error) => {
            toast.error(FirebaseErrors[error.code] || "Error fetching users");
            setLoading(false);
        });

        // Views (for donors)
        const viewsQuery = query(
            collection(firestore, "views"),
            where("createdBy", "==", user.uid)
        );
        unsubViews = onSnapshot(viewsQuery, (snapshot) => {
            setStats(prev => ({ ...prev, views: snapshot.size }));
            setLoading(false);
        }, (error) => {
            toast.error(FirebaseErrors[error.code] || "Error fetching views");
            setLoading(false);
        });

        // Wishlists (for users)
        const wishlistQuery = query(
            collection(firestore, "wishlist"),
            where("createdBy", "==", user.uid)
        );
        unsubWishlist = onSnapshot(wishlistQuery, (snapshot) => {
            setStats(prev => ({ ...prev, wishlists: snapshot.size }));
            setLoading(false);
        }, (error) => {
            toast.error(FirebaseErrors[error.code] || "Error fetching wishlist");
            setLoading(false);
        });

        return () => {
            unsubItems();
            unsubViews();
            unsubWishlist();
            unsubPending();
            unsubDonations();
            unsubUsers();
        };
    }, [user]);

    if (loading) {
        return <StatCardsSkeleton />;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard title="Total Listings" value={stats.listings.toString()} color="bg-blue-100" textColor="text-blue-800" icon={ListTodo} />
            <StatCard title="Pending Requests" value={stats.pendingRequests.toString()} color="bg-green-100" textColor="text-green-800" icon={Clock} />
            <StatCard title="Donations Received" value={stats.donations.toString()} color="bg-yellow-100" textColor="text-yellow-800" icon={Gift} />
            <StatCard title="Number of Donors" value={stats.donors.toString()} color="bg-purple-100" textColor="text-purple-800" icon={Users} />
            <StatCard title="Number of Beneficiaries" value={stats.beneficiaries.toString()} color="bg-purple-100" textColor="text-purple-800" icon={Users} />
            <StatCard title="Total Views" value={stats.views.toString()} color="bg-pink-100" textColor="text-pink-800" icon={Eye} />
            <StatCard title="Total Wishlists" value={stats.wishlists.toString()} color="bg-pink-100" textColor="text-pink-800" icon={Heart} />
        </div>
    )
}

function StatCardsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>
    )
}

function StatCardSkeleton() {
    return (
        <Card className="border-none bg-gray-100 animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-24" />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16" />
            </CardContent>
        </Card>
    )
}

function StatCard({ title, value, color, textColor, icon: Icon }: { title: string, value: string, color: string, textColor: string, icon: any }) {
  return (
    <Card className={`${color} border-none`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium ${textColor} flex items-center gap-2`}>
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
      </CardContent>
    </Card>
  )
}