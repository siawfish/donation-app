'use client';

import { useAuth } from '@/firebase/auth/AuthContext';
import React from 'react';
import { UserCog, Lock, FileText, Shield, UserX, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import EditProfile from './EditProfile';
import { useQueryState } from 'nuqs';
import ChangePassword from './ChangePassword';
import ConfirmDeleteAccount from './ConfirmDeleteAccount';

interface SettingsCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}


    
const SettingsOptions = [
    {
        icon: <UserCog size={24} />,
        title: "Edit Profile",
        description: "Update your personal information, profile picture, and preferences to keep your account up to date.",
        action: "edit_profile"
    },
    {
        icon: <Lock size={24} />,
        title: "Change Password",
        description: "Strengthen your account security by updating your password regularly.",
        action: "change_password"
    },
    {
        icon: <FileText size={24} />,
        title: "Terms of Condition",
        description: "Review our terms and conditions to understand your rights and responsibilities.",
        action: "terms_of_condition"
    },
    {
        icon: <Shield size={24} />,
        title: "Privacy Policy",
        description: "Learn about how we protect and handle your personal information.",
        action: "privacy_policy"
    },
    {
        icon: <UserX size={24} />,
        title: "Disable Account",
        description: "Temporarily disable your account and hide your profile from other users.",
        action: "disable_account"
    }
];

const SettingsCard = ({ icon, title, description, onClick }: SettingsCardProps) => (
  <div onClick={onClick} className="bg-white p-4 lg:p-6 border border-secondary rounded-lg hover:bg-primary-foreground hover:border-primary transition-all cursor-pointer">
    <div className="space-y-4">
      <div className="text-primary">{icon}</div>
      <h3 className="font-semibold text-sm lg:text-lg">{title}</h3>
      <p className="text-muted-foreground text-xs lg:text-sm line-clamp-2">{description}</p>
    </div>
  </div>
);

export default function Settings() {
    const { user } = useAuth();
    const [action, setAction] = useQueryState('action')
    return (
        <div className="container max-w-7xl mx-auto px-6 space-y-6"> 
            <div>
                <h2 className="text-xl font-semibold">{`${user?.displayName?.split(' ')[0]}'s Settings`}</h2>
                <p className="text-muted-foreground">Manage your account settings and preferences.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[75%_25%] gap-6">
                <div className="space-y-6 lg:border-r lg:pr-6">
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                        {SettingsOptions.map((option, index) => (
                            <SettingsCard
                                key={index}
                                icon={option.icon}
                                title={option.title}
                                description={option.description}
                                onClick={() => setAction(option.action)}
                            />
                        ))}
                    </div>
                </div>
                <div className="hidden lg:block">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <span className="inline-block align-middle mr-2"><HelpCircle size={24} /></span>
                                <span className="inline-block align-middle">Technical Support</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>
                                For any technical issues, questions about your account, or general support inquiries, our dedicated support team is here to help. Please reach out to us at <a href="mailto:support@example.com">support@givny.com</a> and we&apos;ll get back to you within 24 hours.
                            </p>
                        </CardContent>
                        <CardFooter>
                            <Button variant="default" className="rounded-lg">
                                Contact Support
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
            <EditProfile />
            <ChangePassword />
            <ConfirmDeleteAccount />
        </div>
    );
}