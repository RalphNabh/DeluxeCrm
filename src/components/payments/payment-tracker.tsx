"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DollarSign, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  Trash2
} from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string;
  notes?: string;
  paid_at: string;
}

interface PaymentTrackerProps {
  invoiceId: string;
  totalAmount: number;
  onPaymentAdded: (payment: Payment) => void;
}

export default function PaymentTracker({ 
  invoiceId, 
  totalAmount, 
  onPaymentAdded 
}: PaymentTrackerProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    method: 'Cash',
    reference: '',
    notes: ''
  });

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = totalAmount - totalPaid;
  const isFullyPaid = remaining <= 0;

  const handleAddPayment = async () => {
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoiceId,
          amount: newPayment.amount,
          method: newPayment.method,
          reference: newPayment.reference,
          notes: newPayment.notes
        })
      });

      if (!response.ok) throw new Error('Failed to add payment');

      const payment = await response.json();
      setPayments(prev => [...prev, payment]);
      onPaymentAdded(payment);
      
      // Reset form
      setNewPayment({ amount: 0, method: 'Cash', reference: '', notes: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding payment:', error);
    }
  };

  const getStatusIcon = () => {
    if (isFullyPaid) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (totalPaid > 0) return <Clock className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  const getStatusText = () => {
    if (isFullyPaid) return 'Fully Paid';
    if (totalPaid > 0) return 'Partially Paid';
    return 'Unpaid';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <span>Payment Tracking</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Status */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="font-medium">{getStatusText()}</span>
            </div>
            <span className="text-sm text-gray-600">
              ${totalPaid.toFixed(2)} of ${totalAmount.toFixed(2)}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                isFullyPaid ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min((totalPaid / totalAmount) * 100, 100)}%` }}
            />
          </div>
          
          {remaining > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              Remaining: ${remaining.toFixed(2)}
            </p>
          )}
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Payment History</h4>
            <div className="space-y-2">
              {payments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium">${payment.amount.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">
                        {payment.method} • {new Date(payment.paid_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {payment.reference}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Payment Form */}
        {!isFullyPaid && (
          <div>
            {!showAddForm ? (
              <Button 
                onClick={() => setShowAddForm(true)}
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            ) : (
              <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Amount</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment(prev => ({ 
                        ...prev, 
                        amount: parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Method</label>
                    <Select
                      value={newPayment.method}
                      onValueChange={(value) => setNewPayment(prev => ({ 
                        ...prev, 
                        method: value 
                      }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Reference</label>
                  <Input
                    value={newPayment.reference}
                    onChange={(e) => setNewPayment(prev => ({ 
                      ...prev, 
                      reference: e.target.value 
                    }))}
                    placeholder="Check #, Transaction ID, etc."
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment(prev => ({ 
                      ...prev, 
                      notes: e.target.value 
                    }))}
                    placeholder="Optional notes about this payment"
                    rows={2}
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button onClick={handleAddPayment} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Payment Options */}
        {!isFullyPaid && (
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setNewPayment(prev => ({ 
                ...prev, 
                amount: remaining 
              }))}
            >
              Full Amount
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setNewPayment(prev => ({ 
                ...prev, 
                amount: Math.ceil(remaining / 2) 
              }))}
            >
              Half Payment
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
