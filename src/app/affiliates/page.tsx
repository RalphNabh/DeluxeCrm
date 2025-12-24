"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  DollarSign,
  Calendar,
  BarChart3,
  Zap, 
  Settings, 
  Search,
  Bell,
  ChevronDown,
  Plus,
  CheckSquare,
  User,
  Copy,
  Share2,
  TrendingUp,
  Gift,
  Award,
  Target,
  CheckCircle,
  Clock,
  X,
  Mail,
  Link2,
  AlertCircle,
  Menu
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SignOutButton from "@/components/auth/sign-out";
import UserProfile from "@/components/layout/user-profile";
import PageSidebar from "@/components/layout/page-sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { formatCurrencyWithSymbol } from "@/lib/utils/currency";
import { Label } from "@/components/ui/label";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: DollarSign, label: "Invoices", href: "/invoices" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Users, label: "Team", href: "/team" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Gift, label: "Affiliates", href: "/affiliates", active: true },
  { icon: Settings, label: "Settings", href: "/settings" },
];

interface Affiliate {
  id: string;
  user_id: string;
  referral_code: string;
  total_referrals: number;
  total_earnings: number;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
}

interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referral_code: string;
  status: 'Pending' | 'Active' | 'Converted' | 'Cancelled';
  subscription_value: number;
  commission_earned: number;
  commission_paid: boolean;
  created_at: string;
  converted_at?: string;
  referred_user?: {
    id: string;
    email: string;
  };
}

interface AffiliateStats {
  total_referrals: number;
  active_referrals: number;
  total_earnings: number;
  pending_earnings: number;
  commission_rate: number;
}

export default function AffiliatesPage() {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchAffiliateData();
  }, []);

  const fetchAffiliateData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/affiliates');
      const data = await response.json();
      
      if (!response.ok) {
        // Check if it's a schema missing error
        if (data.code === 'SCHEMA_MISSING') {
          setError('Database schema not found. Please run the supabase-affiliates-schema.sql migration in your Supabase SQL Editor.');
        } else {
          throw new Error(data.error || 'Failed to fetch affiliate data');
        }
        return;
      }
      
      setAffiliate(data.affiliate);
      setReferrals(data.referrals || []);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  };

  const referralLink = affiliate?.referral_code
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${affiliate.referral_code}`
    : '';

  const handleCopyLink = async () => {
    if (referralLink) {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share && referralLink) {
      try {
        await navigator.share({
          title: 'Join DyluxePro CRM',
          text: `Join DyluxePro CRM using my referral link and we both get benefits!`,
          url: referralLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const getStatusColor = (status: Referral['status']) => {
    switch (status) {
      case 'Converted': return 'bg-green-100 text-green-800';
      case 'Active': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Referral['status']) => {
    switch (status) {
      case 'Converted': return CheckCircle;
      case 'Active': return TrendingUp;
      case 'Pending': return Clock;
      case 'Cancelled': return X;
      default: return Clock;
    }
  };

  if (loading && !affiliate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading affiliate program...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <PageSidebar 
        items={sidebarItems.map(item => ({
          ...item,
          active: item.active || false
        }))}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Menu Button */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="mr-3"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="text-lg font-bold text-blue-600">
            DyluxePro
          </Link>
        </div>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Affiliate Program</h1>
              <p className="text-gray-600 mt-1">Earn commissions by referring new users</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button onClick={() => setShowShareDialog(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <Share2 className="h-4 w-4 mr-2" />
                Share Referral Link
              </Button>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-avatar.jpg" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <SignOutButton />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Setup Required</h3>
                  <p className="text-red-800 text-sm">{error}</p>
                  {error.includes('schema') && (
                    <p className="text-red-700 text-xs mt-2">
                      Go to your Supabase Dashboard → SQL Editor → Run the <code className="bg-red-100 px-1 rounded">supabase-affiliates-schema.sql</code> file
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          {stats && !error && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Referrals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-blue-600">{stats.total_referrals}</div>
                    <Users className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Referrals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-green-600">{stats.active_referrals}</div>
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-amber-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-yellow-600">{formatCurrencyWithSymbol(stats.total_earnings)}</div>
                    <DollarSign className="h-8 w-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Commission Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-purple-600">{stats.commission_rate}%</div>
                    <Award className="h-8 w-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Referral Code Section */}
          {affiliate?.referral_code && (
            <Card className="mb-8 border-0 shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Gift className="h-5 w-5 mr-2" />
                  Your Referral Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                    <div className="text-sm text-blue-100 mb-2">Share this code with friends</div>
                    <div className="text-2xl font-bold font-mono">{affiliate.referral_code}</div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleCopyLink}
                    className="bg-white text-blue-600 hover:bg-blue-50"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowShareDialog(true)}
                    className="bg-white text-blue-600 hover:bg-blue-50"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Link
                  </Button>
                </div>
                <div className="mt-4 text-sm text-blue-100">
                  Earn {stats?.commission_rate || 30}% commission on every subscription from your referrals!
                </div>
              </CardContent>
            </Card>
          )}

          {/* Encouragement Section */}
          <Card className="mb-8 border-0 shadow-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Start Earning Today!</h3>
                  <p className="text-green-100">
                    Share your referral link and earn {stats?.commission_rate || 30}% commission on every subscription. 
                    The more you refer, the more you earn!
                  </p>
                </div>
                <Target className="h-16 w-16 text-green-200 opacity-50" />
              </div>
            </CardContent>
          </Card>

          {/* Referrals List */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Your Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No referrals yet</h3>
                  <p className="text-gray-600 mb-4">
                    Start sharing your referral link to earn commissions!
                  </p>
                  <Button onClick={() => setShowShareDialog(true)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Referral Link
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {referrals.map((referral) => {
                    const StatusIcon = getStatusIcon(referral.status);
                    return (
                      <div
                        key={referral.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <div className={`p-2 rounded-full ${getStatusColor(referral.status)}`}>
                            <StatusIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {referral.referred_user?.email || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-500">
                              Referred on {new Date(referral.created_at).toLocaleDateString()}
                              {referral.converted_at && (
                                <span className="ml-2">
                                  • Converted on {new Date(referral.converted_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Status</div>
                            <div className={`font-medium ${getStatusColor(referral.status)} px-2 py-1 rounded text-xs`}>
                              {referral.status}
                            </div>
                          </div>
                          {referral.subscription_value > 0 && (
                            <div className="text-right">
                              <div className="text-sm text-gray-500">Subscription Value</div>
                              <div className="font-semibold text-gray-900">
                                {formatCurrencyWithSymbol(referral.subscription_value)}
                              </div>
                            </div>
                          )}
                          {referral.commission_earned > 0 && (
                            <div className="text-right">
                              <div className="text-sm text-gray-500">Your Commission</div>
                              <div className="font-bold text-green-600">
                                {formatCurrencyWithSymbol(referral.commission_earned)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Your Referral Link</DialogTitle>
            <DialogDescription>
              Share this link with friends and earn commissions when they subscribe!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="referral-link">Referral Link</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Input
                  id="referral-link"
                  value={referralLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  title="Copy link"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="referral-code">Referral Code</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Input
                  id="referral-code"
                  value={affiliate?.referral_code || 'Loading...'}
                  readOnly
                  className="font-mono text-lg font-bold text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (affiliate?.referral_code) {
                      navigator.clipboard.writeText(affiliate.referral_code);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  title="Copy code"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (referralLink) {
                    window.open(`mailto:?subject=Join DyluxePro CRM&body=Join using my referral link: ${referralLink}`, '_blank');
                  }
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

