"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingButton } from "@/components/ui/loading-button"
import { PageLoader } from "@/components/ui/page-loader"
import { useLoading } from "@/hooks/use-loading"
import { useToast } from "@/hooks/use-toast"
import {
  DollarSign,
  ShoppingBag,
  Globe,
  Clock,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Download,
} from "lucide-react"
import { StatCardSkeleton } from "@/components/ui/stat-card-skeleton"
import apiClient from "@/lib/apiClient"
import { API_BASE } from "@/config/constants"

interface TopProduct {
  id: string
  name: string
  sku: string
  sales_rate_inc_dis_and_tax: string
  _count: {
    order_items: number
  }
}

interface WebsiteOrder {
  id: string
  order_number: string
  total_amount: string
  status: string
  created_at: string
  customer_name?: string
}

interface DashboardHomeProps {
  onNavigate?: (tab: string) => void;
}

const isToday = (dateString: string) => {
  const date = new Date(dateString)
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

export function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [websiteOrders, setWebsiteOrders] = useState<WebsiteOrder[]>([])
  const [initialLoading, setInitialLoading] = useState(true)

  const { loading: refreshLoading, withLoading: withRefreshLoading } = useLoading()
  const { loading: exportLoading, withLoading: withExportLoading } = useLoading()
  const { toast } = useToast()

  const websiteStats = useMemo(() => {
    const todayOrders = websiteOrders.filter((order) => isToday(order.created_at))
    const totalRevenue = websiteOrders.reduce(
      (sum, order) => sum + (Number(order.total_amount) || 0),
      0,
    )
    const todayRevenue = todayOrders.reduce(
      (sum, order) => sum + (Number(order.total_amount) || 0),
      0,
    )
    const pendingOrders = websiteOrders.filter((order) => order.status === "PENDING").length
    const completedOrders = websiteOrders.filter((order) => order.status === "COMPLETED").length

    return {
      totalOrders: websiteOrders.length,
      todayOrders: todayOrders.length,
      totalRevenue,
      todayRevenue,
      pendingOrders,
      completedOrders,
    }
  }, [websiteOrders])

  const getTopProducts = async () => {
    try {
      const response = await apiClient.get("/products/best-selling")
      if (response?.data?.success) {
        setTopProducts(response.data.data || [])
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Top Products Error",
        description: error.response?.data?.message || "Failed to fetch top products",
      })
    }
  }

  const getWebsiteOrders = async () => {
    try {
      const response = await apiClient.get(`${API_BASE}/guest/order`, {
        params: { page: "1", pageSize: "100" },
      })
      const rawOrders = response.data?.data?.data || []
      setWebsiteOrders(
        rawOrders.map((order: WebsiteOrder) => ({
          id: order.id,
          order_number: order.order_number,
          total_amount: order.total_amount,
          status: order.status,
          created_at: order.created_at,
          customer_name: order.customer_name,
        })),
      )
    } catch (error: any) {
      setWebsiteOrders([])
      toast({
        variant: "destructive",
        title: "Website Orders Error",
        description: error.response?.data?.message || "Failed to fetch website orders",
      })
    }
  }

  const loadAllData = async () => {
    await Promise.all([getTopProducts(), getWebsiteOrders()])
    setInitialLoading(false)
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const handleRefreshData = async () => {
    await withRefreshLoading(async () => {
      try {
        await loadAllData()
        toast({
          variant: "success",
          title: "Data Refreshed",
          description: "Dashboard data has been updated successfully",
        })
      } catch {
        toast({
          variant: "destructive",
          title: "Refresh Failed",
          description: "Could not refresh dashboard data",
        })
      }
    })
  }

  const generateReport = async () => {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF({ unit: "mm", format: "a4" })
    let y = 15

    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("YAM-N7 WEBSITE SALES REPORT", 14, y)
    y += 8
    doc.setFontSize(14)
    doc.text("Website Orders Summary", 14, y)
    y += 8

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y)
    y += 8
    doc.line(14, y, 196, y)
    y += 8

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("Summary", 14, y)
    y += 6
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    const summaryLines = [
      `- Total Website Orders: ${websiteStats.totalOrders}`,
      `- Today's Website Orders: ${websiteStats.todayOrders}`,
      `- Total Website Revenue: Rs ${websiteStats.totalRevenue.toFixed(2)}`,
      `- Today's Website Revenue: Rs ${websiteStats.todayRevenue.toFixed(2)}`,
      `- Pending Orders: ${websiteStats.pendingOrders}`,
      `- Completed Orders: ${websiteStats.completedOrders}`,
    ]
    summaryLines.forEach((line) => {
      doc.text(line, 16, y)
      y += 5
    })
    y += 2

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("Recent Website Orders", 14, y)
    y += 6
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    const recentLines = websiteOrders.length
      ? websiteOrders.slice(0, 10).map(
          (order) =>
            `- ${order.order_number} - Rs ${Number(order.total_amount).toFixed(2)} - ${order.status}`,
        )
      : ["- No website orders yet"]
    recentLines.forEach((line) => {
      if (y > 275) {
        doc.addPage()
        y = 15
      }
      const wrapped = doc.splitTextToSize(line, 178)
      doc.text(wrapped, 16, y)
      y += wrapped.length * 5
    })
    y += 2

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("Top Products", 14, y)
    y += 6
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    const productLines = topProducts.length
      ? topProducts.slice(0, 5).map(
          (product, index) =>
            `${index + 1}. ${product.name} - ${product._count.order_items} orders - Rs ${product.sales_rate_inc_dis_and_tax}`,
        )
      : ["No top products data"]
    productLines.forEach((line) => {
      if (y > 275) {
        doc.addPage()
        y = 15
      }
      const wrapped = doc.splitTextToSize(line, 178)
      doc.text(wrapped, 16, y)
      y += wrapped.length * 5
    })

    doc.save(`yamn7-website-sales-report-${Date.now()}.pdf`)
  }

  const handleExportReport = async () => {
    await withExportLoading(async () => {
      try {
        await generateReport()
        toast({
          variant: "success",
          title: "Report Exported",
          description: "Website sales report PDF has been downloaded successfully",
        })
      } catch {
        toast({
          variant: "destructive",
          title: "Export Failed",
          description: "Could not generate the report",
        })
      }
    })
  }

  const formatCurrency = (amount: string | number) => `Rs ${Number(amount).toFixed(2)}`

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      case "PROCESSING":
        return "bg-blue-100 text-blue-800"
      case "PENDING":
        return "bg-amber-100 text-amber-800"
      default:
        return "bg-red-100 text-red-800"
    }
  }

  if (initialLoading) {
    return <PageLoader message="Loading dashboard..." />
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-7 w-7 text-blue-600" />
            Dashboard
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Website sales overview for YAM-N7 Perfume Store.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <LoadingButton
            variant="outline"
            onClick={handleRefreshData}
            loading={refreshLoading}
            loadingText="Refreshing..."
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </LoadingButton>
          <LoadingButton onClick={handleExportReport} loading={exportLoading} loadingText="Generating...">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </LoadingButton>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Website Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{websiteStats.todayOrders}</div>
            <p className="text-xs text-gray-500 mt-1">
              Revenue: {formatCurrency(websiteStats.todayRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Website Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(websiteStats.totalRevenue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">{websiteStats.totalOrders} total orders</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate?.("website-orders")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{websiteStats.pendingOrders}</div>
            <p className="text-xs text-blue-600 mt-1">View website orders →</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{websiteStats.completedOrders}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Website Orders
              <Badge variant="secondary">{websiteOrders.length} orders</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {websiteOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="font-medium">{order.order_number}</div>
                    <div className="text-sm text-gray-500">
                      {order.customer_name || "Website Customer"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(order.total_amount)}</div>
                    <Badge className={getStatusBadgeClass(order.status)}>{order.status}</Badge>
                  </div>
                </div>
              ))}
              {websiteOrders.length === 0 && (
                <div className="text-center text-gray-500 py-4">No website orders yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Top Products
              <Badge variant="secondary">Best sellers</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.length === 0 ? (
                <div className="text-center text-gray-500 py-4">No top products data</div>
              ) : (
                topProducts.slice(0, 5).map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <div>
                        <div className="font-medium flex items-center space-x-2">
                          <span>{product.name}</span>
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        </div>
                        <div className="text-sm text-gray-500">
                          {product._count.order_items} orders
                        </div>
                      </div>
                    </div>
                    <div className="font-medium">
                      {formatCurrency(product.sales_rate_inc_dis_and_tax)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
