"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { User, Mail, Lock, Phone, Building, Briefcase } from "lucide-react";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      
      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/verify-email`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: fullName,
            phone: phone.trim() || undefined,
            company_name: companyName.trim() || undefined,
            business_type: businessType && businessType !== 'none' ? businessType : undefined,
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Create user profile with additional information
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            user_id: data.user.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: fullName,
            phone: phone.trim() || null,
            company_name: companyName.trim() || null,
            business_type: businessType && businessType !== 'none' ? businessType : null,
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Don't fail signup if profile creation fails - it will be created by trigger
        }

        // Redirect to verification page
        router.push("/verify-email");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your DyluxePro account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              sign in to existing account
            </Link>
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>Create your account to start managing your contracting business</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                      First Name *
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="mt-1"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                      Last Name *
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="mt-1"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                    placeholder="john.doe@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Business Information Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Business Information
                </h3>

                <div>
                  <Label htmlFor="companyName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    autoComplete="organization"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1"
                    placeholder="Your Company LLC"
                  />
                </div>

                <div>
                  <Label htmlFor="businessType" className="text-sm font-medium text-gray-700">
                    Business Type
                  </Label>
                  {mounted && (
                  <Select value={businessType || "none"} onValueChange={(value) => setBusinessType(value || "none")}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="General Contractor">General Contractor</SelectItem>
                      <SelectItem value="Plumbing">Plumbing</SelectItem>
                      <SelectItem value="Electrical">Electrical</SelectItem>
                      <SelectItem value="HVAC">HVAC</SelectItem>
                      <SelectItem value="Landscaping">Landscaping</SelectItem>
                      <SelectItem value="Roofing">Roofing</SelectItem>
                      <SelectItem value="Painting">Painting</SelectItem>
                      <SelectItem value="Flooring">Flooring</SelectItem>
                      <SelectItem value="Carpentry">Carpentry</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  )}
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Account Security
                </h3>

                <div>
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password *
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1"
                    placeholder="At least 6 characters"
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                    Confirm Password *
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1"
                    placeholder="Re-enter your password"
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-6"
              >
                {loading ? "Creating account..." : "Create account"}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}