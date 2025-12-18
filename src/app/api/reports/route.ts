import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timeRange = request.nextUrl.searchParams.get('timeRange') || '30d';
    
    // Calculate date range
    const now = new Date();
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysAgo);

    // Fetch invoices (revenue data)
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, total, status, created_at, client_id')
      .eq('user_id', userData.user.id)
      .gte('created_at', startDate.toISOString());

    if (invoicesError) {
      throw invoicesError;
    }

    // Fetch payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, created_at, invoice_id')
      .eq('user_id', userData.user.id)
      .gte('created_at', startDate.toISOString());

    if (paymentsError) {
      throw paymentsError;
    }

    // Fetch jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, status, created_at, client_id')
      .eq('user_id', userData.user.id)
      .gte('created_at', startDate.toISOString());

    if (jobsError) {
      throw jobsError;
    }

    // Fetch estimates
    const { data: estimates, error: estimatesError } = await supabase
      .from('estimates')
      .select('id, total, status, created_at')
      .eq('user_id', userData.user.id)
      .gte('created_at', startDate.toISOString());

    if (estimatesError) {
      throw estimatesError;
    }

    // Fetch clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, created_at')
      .eq('user_id', userData.user.id);

    if (clientsError) {
      throw clientsError;
    }

    // Calculate metrics
    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const completedJobs = jobs.filter(j => j.status === 'Completed').length;
    const totalJobs = jobs.length;
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
    const totalClients = clients.length;
    const newClients = clients.filter(c => new Date(c.created_at) >= startDate).length;
    const clientGrowth = totalClients > 0 ? (newClients / totalClients) * 100 : 0;
    
    // Calculate monthly revenue (last 30 days)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyRevenue = payments
      .filter(p => new Date(p.created_at) >= thirtyDaysAgo)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Calculate revenue growth (compare last 30 days to previous 30 days)
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const previousMonthRevenue = payments
      .filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate >= sixtyDaysAgo && paymentDate < thirtyDaysAgo;
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const revenueGrowth = previousMonthRevenue > 0 
      ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : 0;

    const averageJobValue = completedJobs > 0 ? totalRevenue / completedJobs : 0;
    const totalEstimates = estimates.length;
    const approvedEstimates = estimates.filter(e => e.status === 'Approved').length;
    const estimateConversion = totalEstimates > 0 ? (approvedEstimates / totalEstimates) * 100 : 0;

    // Calculate revenue by month
    const revenueByMonth: Record<string, { revenue: number; jobs: number }> = {};
    
    payments.forEach(payment => {
      const date = new Date(payment.created_at);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!revenueByMonth[monthKey]) {
        revenueByMonth[monthKey] = { revenue: 0, jobs: 0 };
      }
      revenueByMonth[monthKey].revenue += Number(payment.amount || 0);
    });

    jobs.forEach(job => {
      const date = new Date(job.created_at);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!revenueByMonth[monthKey]) {
        revenueByMonth[monthKey] = { revenue: 0, jobs: 0 };
      }
      revenueByMonth[monthKey].jobs += 1;
    });

    const revenueData = Object.entries(revenueByMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(-6); // Last 6 months

    // Calculate top clients by revenue
    const clientRevenue: Record<string, { totalSpent: number; jobsCompleted: number; lastJob: string }> = {};
    
    payments.forEach(payment => {
      // Get invoice to find client
      const invoice = invoices.find(inv => inv.id === payment.invoice_id);
      if (invoice) {
        if (!clientRevenue[invoice.client_id]) {
          clientRevenue[invoice.client_id] = { totalSpent: 0, jobsCompleted: 0, lastJob: '' };
        }
        clientRevenue[invoice.client_id].totalSpent += Number(payment.amount || 0);
      }
    });

    jobs.forEach(job => {
      if (!clientRevenue[job.client_id]) {
        clientRevenue[job.client_id] = { totalSpent: 0, jobsCompleted: 0, lastJob: '' };
      }
      if (job.status === 'Completed') {
        clientRevenue[job.client_id].jobsCompleted += 1;
      }
      const jobDate = new Date(job.created_at).toISOString();
      if (!clientRevenue[job.client_id].lastJob || jobDate > clientRevenue[job.client_id].lastJob) {
        clientRevenue[job.client_id].lastJob = jobDate;
      }
    });

    // Get client names
    const clientIds = Object.keys(clientRevenue);
    const { data: topClientsData } = await supabase
      .from('clients')
      .select('id, name')
      .eq('user_id', userData.user.id)
      .in('id', clientIds);

    const topClients = Object.entries(clientRevenue)
      .map(([clientId, data]) => {
        const client = topClientsData?.find(c => c.id === clientId);
        return {
          id: clientId,
          name: client?.name || 'Unknown Client',
          ...data
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    return NextResponse.json({
      metrics: {
        totalRevenue,
        monthlyRevenue,
        revenueGrowth,
        totalJobs,
        completedJobs,
        completionRate,
        totalClients,
        newClients,
        clientGrowth,
        averageJobValue,
        totalEstimates,
        estimateConversion
      },
      revenueData,
      topClients
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}


