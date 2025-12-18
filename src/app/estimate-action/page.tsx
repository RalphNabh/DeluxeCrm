"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

function EstimateActionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    status?: string;
  } | null>(null);

  const estimateId = searchParams.get('estimateId');
  const action = searchParams.get('action');
  const clientEmail = searchParams.get('clientEmail');
  const clientName = searchParams.get('clientName');

  useEffect(() => {
    if (estimateId && action && (action === 'approve' || action === 'request_changes')) {
      handleAction();
    }
  }, [estimateId, action]);

  const handleAction = async () => {
    if (!estimateId || !action) return;

    setLoading(true);
    try {
      const response = await fetch('/api/email/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimateId,
          action,
          clientEmail,
          clientName
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          status: data.status
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to process action'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'An error occurred while processing your request'
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionTitle = () => {
    if (action === 'approve') return 'Approve Estimate';
    if (action === 'request_changes') return 'Request Changes';
    return 'Estimate Action';
  };

  const getActionDescription = () => {
    if (action === 'approve') return 'You are about to approve this estimate. This will notify the team and move the project forward.';
    if (action === 'request_changes') return 'You are about to request changes to this estimate. The team will review your feedback and provide an updated estimate.';
    return 'Processing your request...';
  };

  if (!estimateId || !action) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Request</h2>
              <p className="text-gray-600 mb-4">This link appears to be invalid or incomplete.</p>
              <Button onClick={() => router.push('/')} variant="outline">
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            {getActionTitle()}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {loading && (
            <div className="text-center">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Processing your request...</p>
            </div>
          )}

          {result && (
            <div className="text-center">
              {result.success ? (
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              ) : (
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              )}
              
              <h3 className={`text-lg font-semibold mb-2 ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.success ? 'Success!' : 'Error'}
              </h3>
              
              <p className="text-gray-600 mb-4">{result.message}</p>
              
              {result.status && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-700">
                    <strong>New Status:</strong> {result.status}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Button 
                  onClick={() => router.push('/')} 
                  className="w-full"
                >
                  Go to Home
                </Button>
                <Button 
                  onClick={() => window.close()} 
                  variant="outline" 
                  className="w-full"
                >
                  Close Window
                </Button>
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">{getActionDescription()}</p>
              <Button 
                onClick={handleAction}
                className="w-full"
                disabled={loading}
              >
                {action === 'approve' ? 'Approve Estimate' : 'Request Changes'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EstimateActionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <EstimateActionContent />
    </Suspense>
  );
}
