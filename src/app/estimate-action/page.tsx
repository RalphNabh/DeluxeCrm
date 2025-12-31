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
  const [contractAgreed, setContractAgreed] = useState(false);
  const [estimate, setEstimate] = useState<{ contract_message?: string } | null>(null);

  const estimateId = searchParams.get('estimateId');
  const action = searchParams.get('action');
  const clientEmail = searchParams.get('clientEmail');
  const clientName = searchParams.get('clientName');

  // Fetch estimate to get contract message (public endpoint, no auth required)
  useEffect(() => {
    if (estimateId && action === 'approve') {
      const url = new URL('/api/estimates/public', window.location.origin);
      url.searchParams.set('estimateId', estimateId);
      if (clientEmail) {
        url.searchParams.set('clientEmail', clientEmail);
      }
      
      fetch(url.toString())
        .then(res => res.json())
        .then(data => {
          if (data.contract_message) {
            setEstimate({ contract_message: data.contract_message });
          }
        })
        .catch(err => console.error('Error fetching contract message:', err));
    }
  }, [estimateId, action, clientEmail]);

  useEffect(() => {
    // Only auto-submit for request_changes, not for approve (approve needs checkbox confirmation)
    if (estimateId && action && action === 'request_changes') {
      handleAction();
    }
  }, [estimateId, action]);

  const handleAction = async () => {
    if (!estimateId || !action) return;
    
    // Require contract agreement for approval if contract exists
    if (action === 'approve' && estimate?.contract_message && !contractAgreed) {
      return; // Don't proceed without agreement
    }

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
            <div className="space-y-4">
              {/* Show contract message if approving */}
              {action === 'approve' && estimate?.contract_message && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
                  <h4 className="font-semibold text-blue-900 mb-2">Contract Terms & Conditions</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {estimate.contract_message}
                  </div>
                </div>
              )}
              
              <p className="text-gray-600 text-center">{getActionDescription()}</p>
              
              {/* Contract agreement checkbox for approval */}
              {action === 'approve' && estimate?.contract_message && (
                <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="contract-agree"
                    checked={contractAgreed}
                    onChange={(e) => setContractAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="contract-agree" className="text-sm text-gray-700 cursor-pointer">
                    <strong>I agree to the contract terms and conditions</strong> listed above. By approving this estimate, I acknowledge that I have read, understood, and agree to be bound by all terms and conditions.
                  </label>
                </div>
              )}
              
              <Button 
                onClick={handleAction}
                className="w-full"
                disabled={loading || (action === 'approve' && estimate?.contract_message && !contractAgreed)}
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
