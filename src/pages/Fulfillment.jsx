import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  getPicklists,
  getPicklistDetails,
  generateWavePicklist,
  recordPickItem,
  verifyPackScan,
  bookShipment,
  getShipments,
  getShipmentLabel,
  generateManifest,
  getManifests,
  getAuditLogs,
} from '../api/fulfillment.js';
import { getWarehouses } from '../api/inventory.js';
import { getOrders } from '../api/orders.js';
import {
  DataTable,
  TableToolbar,
  SearchBar,
  TableIconButton,
  InfoTooltip,
  StatusBadge,
} from '../components/common';

export default function Fulfillment() {
  const [activeTab, setActiveTab] = useState('picking'); // 'picking' | 'packing' | 'shipping' | 'audit'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Common Metadata
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [search, setSearch] = useState('');

  // 1. Picklist Tab Data
  const [picklists, setPicklists] = useState([]);
  const [picklistPagination, setPicklistPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [selectedPicklist, setSelectedPicklist] = useState(null);
  const [isPickDrawerOpen, setIsPickDrawerOpen] = useState(false);
  const [isWaveModalOpen, setIsWaveModalOpen] = useState(false);
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [generatingWave, setGeneratingWave] = useState(false);

  // 2. Packing Station Tab Data
  const [packOrders, setPackOrders] = useState([]);
  const [activePackOrder, setActivePackOrder] = useState(null);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scanVerificationResult, setScanVerificationResult] = useState(null);
  const [verifiedItemSkus, setVerifiedItemSkus] = useState({});
  const [packagingDetails, setPackagingDetails] = useState({
    carrier: 'Delhivery',
    boxType: 'Standard Flyer (500g)',
    packageWeightKg: 0.5,
    packageLengthCm: 25,
    packageBreadthCm: 18,
    packageHeightCm: 5,
  });
  const [bookingShipment, setBookingShipment] = useState(false);
  const [activeLabelModal, setActiveLabelModal] = useState(null);

  // 3. Shipments & Manifests Tab Data
  const [shipments, setShipments] = useState([]);
  const [shipmentPagination, setShipmentPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [manifests, setManifests] = useState([]);
  const [manifestPagination, setManifestPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [selectedShipmentIdsForManifest, setSelectedShipmentIdsForManifest] = useState([]);
  const [isManifestModalOpen, setIsManifestModalOpen] = useState(false);
  const [manifestFormData, setManifestFormData] = useState({
    carrier: 'Delhivery',
    driverName: '',
    driverPhone: '',
  });
  const [generatingManifest, setGeneratingManifest] = useState(false);
  const [activeManifestPrint, setActiveManifestPrint] = useState(null);

  // 4. Audit Trail Tab Data
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);

  // Load Warehouses & Metadata on Mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const whData = await getWarehouses();
        const whs = whData || [];
        setWarehouses(whs);
        if (whs.length > 0) {
          setSelectedWarehouseId(whs[0].id);
        }
      } catch (err) {
        console.error('Failed to load warehouses:', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch Wave Picklists
  const fetchPicklists = useCallback(async (page = 1, limitOverride) => {
    try {
      const activeLimit = limitOverride || picklistPagination.limit || 15;
      const data = await getPicklists({
        warehouseId: selectedWarehouseId || undefined,
        search: search || undefined,
        page,
        limit: activeLimit,
      });
      setPicklists(data.picklists || []);
      setPicklistPagination({
        page: data.page || 1,
        limit: data.limit || activeLimit,
        total: data.total || 0,
        totalPages: Math.ceil((data.total || 0) / activeLimit) || 1,
      });
    } catch (err) {
      toast.error('Failed to load picklists');
    }
  }, [selectedWarehouseId, search, picklistPagination.limit]);

  // Fetch Shipments
  const fetchShipments = useCallback(async (page = 1, limitOverride) => {
    try {
      const activeLimit = limitOverride || shipmentPagination.limit || 15;
      const data = await getShipments({
        search: search || undefined,
        page,
        limit: activeLimit,
      });
      setShipments(data.shipments || []);
      setShipmentPagination({
        page: data.page || 1,
        limit: data.limit || activeLimit,
        total: data.total || 0,
        totalPages: Math.ceil((data.total || 0) / activeLimit) || 1,
      });
    } catch (err) {
      toast.error('Failed to load shipments');
    }
  }, [search, shipmentPagination.limit]);

  // Fetch Manifests
  const fetchManifests = useCallback(async (page = 1) => {
    try {
      const data = await getManifests({
        warehouseId: selectedWarehouseId || undefined,
        page,
        limit: 15,
      });
      setManifests(data.manifests || []);
      setManifestPagination({
        page: data.page || 1,
        limit: 15,
        total: data.total || 0,
        totalPages: Math.ceil((data.total || 0) / 15) || 1,
      });
    } catch (err) {
      console.error('Failed to load manifests:', err);
    }
  }, [selectedWarehouseId]);

  // Fetch Orders Ready for Packing
  const fetchPackingOrders = useCallback(async () => {
    try {
      const data = await getOrders({
        status: 'confirmed,allocated,picking',
        limit: 50,
      });
      const orderList = data.orders || [];
      setPackOrders(orderList);
      if (orderList.length > 0 && !activePackOrder) {
        setActivePackOrder(orderList[0]);
      }
    } catch (err) {
      console.error('Failed to load packing orders:', err);
    }
  }, [activePackOrder]);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async (page = 1, limitOverride) => {
    try {
      const activeLimit = limitOverride || auditPagination.limit || 20;
      const data = await getAuditLogs({
        page,
        limit: activeLimit,
      });
      setAuditLogs(data.logs || []);
      setAuditPagination({
        page: data.page || 1,
        limit: data.limit || activeLimit,
        total: data.total || 0,
        totalPages: Math.ceil((data.total || 0) / activeLimit) || 1,
      });
    } catch (err) {
      toast.error('Failed to load audit trail');
    }
  }, [auditPagination.limit]);

  // Consolidated In-Page Refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'picking') {
        await fetchPicklists(picklistPagination.page);
      } else if (activeTab === 'packing') {
        await fetchPackingOrders();
      } else if (activeTab === 'shipping') {
        await Promise.all([fetchShipments(shipmentPagination.page), fetchManifests()]);
      } else if (activeTab === 'audit') {
        await fetchAuditLogs(auditPagination.page);
      }
      toast.success('Data refreshed');
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, fetchPicklists, picklistPagination.page, fetchPackingOrders, fetchShipments, shipmentPagination.page, fetchManifests, fetchAuditLogs, auditPagination.page]);

  // Trigger Data Fetch based on Active Tab
  useEffect(() => {
    setLoading(true);
    const run = async () => {
      if (activeTab === 'picking') {
        await fetchPicklists(1);
      } else if (activeTab === 'packing') {
        await fetchPackingOrders();
      } else if (activeTab === 'shipping') {
        await Promise.all([fetchShipments(1), fetchManifests(1)]);
      } else if (activeTab === 'audit') {
        await fetchAuditLogs(1);
      }
      setLoading(false);
    };
    run();
  }, [activeTab, selectedWarehouseId, fetchPicklists, fetchPackingOrders, fetchShipments, fetchManifests, fetchAuditLogs]);

  // Fetch Orders eligible for Wave Picklist
  async function openWaveModal() {
    try {
      setIsWaveModalOpen(true);
      const data = await getOrders({
        status: 'confirmed,allocated',
        limit: 100,
      });
      setEligibleOrders(data.orders || []);
      setSelectedOrderIds((data.orders || []).map((o) => o.id)); // select all by default
    } catch (err) {
      toast.error('Failed to load eligible orders for wave picking');
    }
  }

  // Handle Wave Generation
  async function handleCreateWavePicklist() {
    if (!selectedWarehouseId) {
      toast.error('Please select a warehouse');
      return;
    }
    if (selectedOrderIds.length === 0) {
      toast.error('Please select at least one order to create wave picklist');
      return;
    }
    setGeneratingWave(true);
    try {
      const picklist = await generateWavePicklist({
        warehouseId: selectedWarehouseId,
        orderIds: selectedOrderIds,
      });
      toast.success(`Wave Picklist ${picklist.code} created with ${picklist.totalItems} items!`);
      setIsWaveModalOpen(false);
      fetchPicklists(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate wave picklist');
    } finally {
      setGeneratingWave(false);
    }
  }

  // View Picklist Items Drawer
  async function handleViewPicklist(picklist) {
    try {
      const details = await getPicklistDetails(picklist.id);
      setSelectedPicklist(details);
      setIsPickDrawerOpen(true);
    } catch (err) {
      toast.error('Failed to load picklist details');
    }
  }

  // Record Pick Progress on Item
  async function handleRecordPick(itemId, currentPicked, requiredQty) {
    try {
      const nextQty = Math.min(requiredQty, currentPicked + 1);
      const res = await recordPickItem(itemId, nextQty);
      toast.success(`Picked (${nextQty}/${requiredQty})`);
      // Update local picklist state
      setSelectedPicklist((prev) => {
        if (!prev) return prev;
        const updatedItems = (prev.items || []).map((it) =>
          it.id === itemId ? { ...it, quantityPicked: nextQty, status: nextQty >= requiredQty ? 'picked' : 'partial' } : it
        );
        return { ...prev, items: updatedItems, status: res.picklistStatus || prev.status };
      });
      fetchPicklists(picklistPagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update pick progress');
    }
  }

  // Verify Barcode Scan at Packing Station
  async function handleScanSubmit(e) {
    e?.preventDefault();
    if (!activePackOrder) {
      toast.error('Please select an order to pack');
      return;
    }
    if (!scannedBarcode.trim()) return;

    try {
      const res = await verifyPackScan({
        orderId: activePackOrder.id,
        scannedCode: scannedBarcode.trim(),
      });

      if (res.status === 200 && res.data?.verified) {
        setScanVerificationResult({
          success: true,
          message: res.message || 'Item verified successfully!',
          product: res.data.product,
        });
        const matchedSku = res.data.product?.internalSku;
        if (matchedSku) {
          setVerifiedItemSkus((prev) => ({
            ...prev,
            [matchedSku]: (prev[matchedSku] || 0) + 1,
          }));
        }
        toast.success(`Verified: ${res.data.product?.title || 'Item'}`);
      } else {
        setScanVerificationResult({
          success: false,
          message: res.message || 'Item does NOT belong to this order!',
        });
        toast.error(res.message || 'Mismatch in scanned item!');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Barcode scan rejected!';
      setScanVerificationResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setScannedBarcode('');
    }
  }

  // Preset Box Sizes
  function handleBoxPresetChange(boxName) {
    const presets = {
      'Standard Flyer (500g)': { weight: 0.5, l: 25, b: 18, h: 5 },
      'Small Box (1 Kg)': { weight: 0.8, l: 20, b: 15, h: 12 },
      'Medium Box (2 Kg)': { weight: 1.5, l: 30, b: 22, h: 15 },
      'Large Apparel Carton (5 Kg)': { weight: 3.5, l: 45, b: 35, h: 25 },
    };
    const p = presets[boxName] || { weight: 0.5, l: 25, b: 18, h: 5 };
    setPackagingDetails((prev) => ({
      ...prev,
      boxType: boxName,
      packageWeightKg: p.weight,
      packageLengthCm: p.l,
      packageBreadthCm: p.b,
      packageHeightCm: p.h,
    }));
  }

  // Volumetric Weight Calculation
  const volumetricWeightKg = useMemo(() => {
    const { packageLengthCm, packageBreadthCm, packageHeightCm } = packagingDetails;
    const vol = (parseFloat(packageLengthCm || 0) * parseFloat(packageBreadthCm || 0) * parseFloat(packageHeightCm || 0)) / 5000;
    return Math.max(0.1, parseFloat(vol.toFixed(3)));
  }, [packagingDetails]);

  const deadWeightKg = parseFloat(packagingDetails.packageWeightKg || 0.5);
  const billableWeightKg = Math.max(deadWeightKg, volumetricWeightKg);
  const estimatedShippingCost = Math.round(billableWeightKg * 50);

  // Book Shipment & Generate AWB
  async function handleBookShipment() {
    if (!activePackOrder) {
      toast.error('No active order selected');
      return;
    }
    setBookingShipment(true);
    try {
      const shipment = await bookShipment({
        orderId: activePackOrder.id,
        carrier: packagingDetails.carrier,
        boxType: packagingDetails.boxType,
        packageWeightKg: deadWeightKg,
        packageLengthCm: packagingDetails.packageLengthCm,
        packageBreadthCm: packagingDetails.packageBreadthCm,
        packageHeightCm: packagingDetails.packageHeightCm,
      });

      toast.success(`AWB ${shipment.awbNumber} generated via ${shipment.carrier}!`);
      setActiveLabelModal(shipment);
      // Remove packed order from WIP list and pick the next
      setPackOrders((prev) => prev.filter((o) => o.id !== activePackOrder.id));
      setActivePackOrder(null);
      setVerifiedItemSkus({});
      setScanVerificationResult(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to book shipment');
    } finally {
      setBookingShipment(false);
    }
  }

  // Generate Handover Manifest
  async function handleGenerateManifest() {
    if (!selectedWarehouseId) {
      toast.error('Warehouse is required');
      return;
    }
    if (selectedShipmentIdsForManifest.length === 0) {
      toast.error('Select at least one packed shipment to manifest');
      return;
    }
    setGeneratingManifest(true);
    try {
      const manifest = await generateManifest({
        warehouseId: selectedWarehouseId,
        carrier: manifestFormData.carrier,
        shipmentIds: selectedShipmentIdsForManifest,
        driverName: manifestFormData.driverName,
        driverPhone: manifestFormData.driverPhone,
      });
      toast.success(`Manifest ${manifest.manifestNumber} generated for ${manifest.carrier}!`);
      setIsManifestModalOpen(false);
      setSelectedShipmentIdsForManifest([]);
      setActiveManifestPrint(manifest);
      fetchShipments(1);
      fetchManifests(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate manifest');
    } finally {
      setGeneratingManifest(false);
    }
  }

  // ==========================================
  // Table Columns Configurations
  // ==========================================

  // 1. Picklist Columns
  const picklistColumns = useMemo(
    () => [
      {
        key: 'code',
        header: 'Wave Code',
        minWidth: 'min-w-[130px]',
        render: (row) => (
          <div className="font-mono font-bold text-accent text-[11px] flex items-center space-x-1">
            <span>{row.code}</span>
          </div>
        ),
      },
      {
        key: 'warehouse',
        header: 'Warehouse',
        render: (row) => (
          <span className="text-[11px] font-medium text-ink">
            {row.warehouse?.name || 'Primary WH'}
          </span>
        ),
      },
      {
        key: 'picker',
        header: 'Assigned Picker',
        render: (row) => (
          <span className="text-[10.5px] text-gray-600">
            {row.pickerName || 'Warehouse Staff'}
          </span>
        ),
      },
      {
        key: 'progress',
        header: 'Pick Progress',
        minWidth: 'min-w-[160px]',
        render: (row) => {
          const total = row.totalItems || 1;
          const picked = row.pickedItems || 0;
          const pct = Math.round((picked / total) * 100);
          return (
            <div className="w-full">
              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                <span>{picked} of {total} picked</span>
                <span className="font-semibold">{pct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-indigo-600' : 'bg-gray-400'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <StatusBadge status={row.status || 'pending'} />
        ),
      },
      {
        key: 'createdAt',
        header: 'Created At',
        render: (row) => (
          <span className="text-[10.5px] text-gray-500">
            {new Date(row.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Action',
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end space-x-1">
            <button
              onClick={() => handleViewPicklist(row)}
              className="h-6 px-2 text-[10.5px] font-semibold rounded bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex items-center space-x-1 cursor-pointer"
            >
              <span>📋</span>
              <span>Pick Sheet</span>
            </button>
          </div>
        ),
      },
    ],
    []
  );

  // 2. Shipments Columns
  const shipmentColumns = useMemo(
    () => [
      {
        key: 'select',
        header: '',
        width: 'w-8',
        render: (row) => {
          const isSelected = selectedShipmentIdsForManifest.includes(row.id);
          const isManifestable = row.status === 'manifested';
          return (
            <input
              type="checkbox"
              disabled={!isManifestable}
              checked={isSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedShipmentIdsForManifest((prev) => [...prev, row.id]);
                } else {
                  setSelectedShipmentIdsForManifest((prev) => prev.filter((id) => id !== row.id));
                }
              }}
              className="rounded border-gray-300 text-accent focus:ring-accent h-3.5 w-3.5"
            />
          );
        },
      },
      {
        key: 'awb',
        header: 'AWB / Tracking Number',
        minWidth: 'min-w-[150px]',
        render: (row) => (
          <div>
            <div className="font-mono font-bold text-ink text-[11px]">{row.awbNumber}</div>
            <div className="text-[10px] text-gray-500">{row.carrier}</div>
          </div>
        ),
      },
      {
        key: 'order',
        header: 'Order Reference',
        render: (row) => (
          <div>
            <div className="font-mono text-ink text-[11px]">
              {row.order?.platformOrderId || row.order?.orderNumber || 'ORD-REF'}
            </div>
            <div className="text-[10px] text-gray-500">{row.order?.buyerName || 'Customer'}</div>
          </div>
        ),
      },
      {
        key: 'weights',
        header: 'Dead / Billable Wt',
        render: (row) => (
          <div className="text-[11px]">
            <span className="text-gray-600">{row.packageWeightKg} kg</span>
            <span className="text-gray-400 mx-1">/</span>
            <span className="font-semibold text-ink">{row.billableWeightKg} kg</span>
          </div>
        ),
      },
      {
        key: 'cost',
        header: 'Est. Freight',
        render: (row) => (
          <span className="font-mono text-[11px] font-semibold text-emerald-700">
            ₹{row.freightCost ? parseFloat(row.freightCost).toFixed(2) : '0.00'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Shipment Status',
        render: (row) => (
          <StatusBadge status={row.status || 'manifested'} />
        ),
      },
      {
        key: 'actions',
        header: 'Label',
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end space-x-1">
            <button
              onClick={() => setActiveLabelModal(row)}
              className="h-6 px-2 text-[10.5px] font-medium rounded bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center space-x-1 cursor-pointer"
            >
              <span>🏷️</span>
              <span>Shipping Label</span>
            </button>
          </div>
        ),
      },
    ],
    [selectedShipmentIdsForManifest]
  );

  // 3. Manifests Columns
  const manifestColumns = useMemo(
    () => [
      {
        key: 'manifestNumber',
        header: 'Manifest Number',
        minWidth: 'min-w-[140px]',
        render: (row) => (
          <div className="font-mono font-bold text-accent text-[11px]">
            {row.manifestNumber}
          </div>
        ),
      },
      {
        key: 'carrier',
        header: 'Carrier Courier',
        render: (row) => (
          <span className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            {row.carrier}
          </span>
        ),
      },
      {
        key: 'driver',
        header: 'Courier Driver',
        render: (row) => (
          <div className="text-[10.5px]">
            <div className="font-medium text-ink">{row.driverName || 'Pickup Staff'}</div>
            {row.driverPhone && <div className="text-gray-500 font-mono text-[9.5px]">{row.driverPhone}</div>}
          </div>
        ),
      },
      {
        key: 'parcels',
        header: 'Total Parcels',
        render: (row) => (
          <span className="font-mono font-bold text-ink text-[11px]">
            {row.totalParcels || 0}
          </span>
        ),
      },
      {
        key: 'handedOverAt',
        header: 'Handover Timestamp',
        render: (row) => (
          <span className="text-[10.5px] text-gray-500">
            {row.handedOverAt
              ? new Date(row.handedOverAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Pending'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Sheet',
        align: 'right',
        render: (row) => (
          <button
            onClick={() => setActiveManifestPrint(row)}
            className="h-6 px-2 text-[10.5px] font-medium rounded bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center space-x-1 cursor-pointer"
          >
            <span>📄</span>
            <span>Print Manifest</span>
          </button>
        ),
      },
    ],
    []
  );

  // 4. Audit Log Columns
  const auditColumns = useMemo(
    () => [
      {
        key: 'timestamp',
        header: 'Timestamp',
        minWidth: 'min-w-[130px]',
        render: (row) => (
          <span className="font-mono text-[10px] text-gray-600">
            {new Date(row.createdAt || row.created_at).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        ),
      },
      {
        key: 'action',
        header: 'Event Action',
        render: (row) => {
          const actionColors = {
            WAVE_PICKLIST_CREATED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            ITEM_PICKED: 'bg-purple-50 text-purple-700 border-purple-200',
            AWB_GENERATED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            MANIFEST_DISPATCHED: 'bg-sky-50 text-sky-700 border-sky-200',
            ORDER_CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
            ORDER_CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
          };
          const cls = actionColors[row.action] || 'bg-gray-50 text-gray-700 border-gray-200';
          return (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${cls}`}>
              {row.action}
            </span>
          );
        },
      },
      {
        key: 'entity',
        header: 'Entity',
        render: (row) => (
          <div className="text-[10.5px]">
            <span className="uppercase text-[9px] font-bold text-gray-400 mr-1">{row.entityType}:</span>
            <span className="font-mono text-ink font-semibold">{row.entityId}</span>
          </div>
        ),
      },
      {
        key: 'actor',
        header: 'Actor',
        render: (row) => (
          <span className="text-[10.5px] text-gray-700 font-medium">
            {row.actorName || 'System'}
          </span>
        ),
      },
      {
        key: 'details',
        header: 'Audit State Snapshot',
        render: (row) => (
          <button
            onClick={() => setSelectedAuditLog(row)}
            className="text-[10px] font-semibold text-accent hover:underline cursor-pointer"
          >
            View Diff & State
          </button>
        ),
      },
    ],
    []
  );

  // Compute Active Tab Metrics for Dense KPI Cards
  const kpiMetrics = useMemo(() => {
    return {
      pendingPicks: picklists.filter((p) => p.status === 'in_progress' || p.status === 'pending').length,
      ordersInPacking: packOrders.length,
      readyToManifest: shipments.filter((s) => s.status === 'manifested').length,
      dispatchedToday: shipments.filter((s) => s.status === 'picked_up').length,
    };
  }, [picklists, packOrders, shipments]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden p-3 space-y-2.5">
      {/* 1. Header with Breadcrumb, Navigation Tabs & In-Page Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-accent uppercase tracking-wider">
            <span>Enterprise OMS</span>
            <span>&rsaquo;</span>
            <span>WMS Lite & Fulfillment Hub</span>
          </div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-ink flex items-center">
              <span>Warehouse Fulfillment & Shipping Logistics</span>
              <InfoTooltip
                title="WMS Lite & Logistics Engine"
                text="End-to-end fulfillment flow: Wave picking with combo bundle explosion, barcode scan packing verification, automated carrier AWB assignment, and carrier handover manifests with centralized audit logging."
              />
            </h1>
          </div>
        </div>

        {/* Tab Switcher & Primary Action */}
        <div className="flex items-center space-x-2">
          {/* Tab buttons */}
          <div className="bg-gray-100 p-0.5 rounded-lg flex space-x-1 border border-border">
            <button
              onClick={() => setActiveTab('picking')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'picking'
                  ? 'bg-white text-ink shadow-2xs'
                  : 'text-gray-600 hover:text-ink'
              }`}
            >
              📦 Wave Picking
            </button>
            <button
              onClick={() => setActiveTab('packing')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'packing'
                  ? 'bg-white text-ink shadow-2xs'
                  : 'text-gray-600 hover:text-ink'
              }`}
            >
              🏷️ Packing Station
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'shipping'
                  ? 'bg-white text-ink shadow-2xs'
                  : 'text-gray-600 hover:text-ink'
              }`}
            >
              🚚 Shipments & Manifests
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-white text-ink shadow-2xs'
                  : 'text-gray-600 hover:text-ink'
              }`}
            >
              📋 Audit Trail
            </button>
          </div>

          {/* In-page Refresh */}
          <TableIconButton
            variant="sync"
            onClick={handleRefresh}
            disabled={refreshing}
            tooltip="Refresh Active Module"
            className={refreshing ? 'animate-spin' : ''}
          />

          {/* Primary Action Button */}
          {activeTab === 'picking' && (
            <button
              onClick={openWaveModal}
              className="h-7 px-3 bg-accent hover:bg-accent-hover text-white rounded text-xs font-semibold shadow-xs flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <span>+</span>
              <span>New Wave Picklist</span>
            </button>
          )}

          {activeTab === 'shipping' && (
            <button
              onClick={() => setIsManifestModalOpen(true)}
              disabled={selectedShipmentIdsForManifest.length === 0}
              className={`h-7 px-3 rounded text-xs font-semibold shadow-xs flex items-center space-x-1 transition-colors cursor-pointer ${
                selectedShipmentIdsForManifest.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>📄</span>
              <span>Create Handover Manifest ({selectedShipmentIdsForManifest.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
        <div className="bg-white border border-border rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10.5px] uppercase font-bold text-gray-400 tracking-wider">Active Picklists</div>
            <div className="text-lg font-black text-ink mt-0.5">{kpiMetrics.pendingPicks}</div>
          </div>
          <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600 text-sm">📦</span>
        </div>

        <div className="bg-white border border-border rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10.5px] uppercase font-bold text-gray-400 tracking-wider">Packing Station Queue</div>
            <div className="text-lg font-black text-ink mt-0.5">{kpiMetrics.ordersInPacking}</div>
          </div>
          <span className="p-2 rounded-lg bg-amber-50 text-amber-600 text-sm">🏷️</span>
        </div>

        <div className="bg-white border border-border rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10.5px] uppercase font-bold text-gray-400 tracking-wider">Ready to Manifest</div>
            <div className="text-lg font-black text-emerald-700 mt-0.5">{kpiMetrics.readyToManifest}</div>
          </div>
          <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600 text-sm">🚚</span>
        </div>

        <div className="bg-white border border-border rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10.5px] uppercase font-bold text-gray-400 tracking-wider">Dispatched Today</div>
            <div className="text-lg font-black text-sky-700 mt-0.5">{kpiMetrics.dispatchedToday}</div>
          </div>
          <span className="p-2 rounded-lg bg-sky-50 text-sky-600 text-sm">✨</span>
        </div>
      </div>

      {/* 3. Main Body Content Switcher */}
      {activeTab === 'picking' && (
        <DataTable
          columns={picklistColumns}
          data={picklists}
          loading={loading}
          minWidth="800px"
          toolbar={
            <TableToolbar
              left={
                <>
                  <SearchBar
                    value={search}
                    onChange={(v) => setSearch(v)}
                    onClear={() => setSearch('')}
                    placeholder="Search wave code..."
                  />
                  {warehouses.length > 0 && (
                    <select
                      value={selectedWarehouseId}
                      onChange={(e) => setSelectedWarehouseId(e.target.value)}
                      className="h-7 text-xs bg-white border border-border rounded px-2 text-ink focus:outline-none focus:border-accent"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              }
            />
          }
          pagination={{
            page: picklistPagination.page,
            limit: picklistPagination.limit,
            total: picklistPagination.total,
            totalPages: picklistPagination.totalPages,
            onPageChange: (p) => fetchPicklists(p),
            itemName: 'picklists',
          }}
          emptyState={{
            icon: '📦',
            title: 'No Wave Picklists',
            description: 'Generate a new wave picklist from confirmed orders to start warehouse picking.',
          }}
        />
      )}

      {activeTab === 'packing' && (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
          {/* Left Column: Packing Orders Queue (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-border rounded-lg flex flex-col overflow-hidden shadow-2xs">
            <div className="p-2.5 border-b border-border bg-gray-50/50 flex items-center justify-between">
              <span className="text-xs font-bold text-ink uppercase tracking-wider">
                Orders Awaiting Packing ({packOrders.length})
              </span>
              <button
                onClick={fetchPackingOrders}
                className="text-[10.5px] font-semibold text-accent hover:underline cursor-pointer"
              >
                Refresh
              </button>
            </div>
            <div className="flex-1 overflow-auto divide-y divide-gray-100">
              {packOrders.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-xs">
                  All orders packed and ready for dispatch! 🎉
                </div>
              ) : (
                packOrders.map((ord) => {
                  const isSelected = activePackOrder?.id === ord.id;
                  return (
                    <div
                      key={ord.id}
                      onClick={() => {
                        setActivePackOrder(ord);
                        setScanVerificationResult(null);
                        setVerifiedItemSkus({});
                      }}
                      className={`p-2.5 transition-colors cursor-pointer text-xs ${
                        isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-ink">
                          {ord.platformOrderId || ord.orderNumber}
                        </span>
                        <StatusBadge status={ord.status} />
                      </div>
                      <div className="text-[11px] text-gray-600 mt-1 flex justify-between">
                        <span>{ord.buyerName || 'Direct Customer'}</span>
                        <span className="font-medium text-gray-800">
                          {ord.items?.length || 0} items
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {ord.buyerCity ? `${ord.buyerCity}, ${ord.buyerState || ''}` : 'Location pending'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Interactive Packing Station (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-border rounded-lg flex flex-col overflow-hidden shadow-2xs">
            {activePackOrder ? (
              <div className="flex-1 overflow-auto p-3.5 space-y-3">
                {/* Order Summary Banner */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-bold text-ink">
                        {activePackOrder.platformOrderId || activePackOrder.orderNumber}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">
                        Packing Station
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Destination: {activePackOrder.buyerName} &bull; {activePackOrder.buyerCity}, {activePackOrder.buyerState}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-emerald-700">
                      Payment: {activePackOrder.paymentMode || 'PREPAID'}
                    </span>
                  </div>
                </div>

                {/* 1. Barcode Verification Input */}
                <div className="border border-border rounded-lg p-3 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink flex items-center space-x-1.5">
                      <span>📷</span>
                      <span>Scan Item Barcode / SKU / EAN</span>
                    </label>
                    <span className="text-[10.5px] text-gray-400">Press ENTER after scanning</span>
                  </div>
                  <form onSubmit={handleScanSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={scannedBarcode}
                      onChange={(e) => setScannedBarcode(e.target.value)}
                      placeholder="Scan product barcode (e.g. SKU, EAN, or ID)..."
                      className="h-8 flex-1 text-xs px-3 border border-border rounded-md font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="h-8 px-3 bg-ink text-white rounded text-xs font-semibold hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      Verify Scan
                    </button>
                  </form>

                  {/* Scan Result Feedback Alert */}
                  {scanVerificationResult && (
                    <div
                      className={`p-2 rounded text-xs font-medium flex items-center space-x-2 ${
                        scanVerificationResult.success
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      <span>{scanVerificationResult.success ? '✅' : '❌'}</span>
                      <span>{scanVerificationResult.message}</span>
                    </div>
                  )}

                  {/* Packing Items Verification Progress */}
                  <div className="mt-2 border-t border-gray-100 pt-2">
                    <div className="text-[11px] font-bold text-gray-500 mb-1">
                      Required Order Contents ({activePackOrder.items?.length || 0}):
                    </div>
                    <div className="space-y-1">
                      {(activePackOrder.items || []).map((it, idx) => {
                        const sku = it.product?.internalSku || it.sku;
                        const verifiedCount = verifiedItemSkus[sku] || 0;
                        const reqCount = it.quantity || 1;
                        const isSatisfied = verifiedCount >= reqCount;
                        return (
                          <div
                            key={it.id || idx}
                            className={`p-1.5 rounded flex items-center justify-between text-xs border ${
                              isSatisfied
                                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                                : 'bg-gray-50 border-gray-200 text-gray-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span>{isSatisfied ? '✓' : '○'}</span>
                              <span className="font-mono font-bold">{sku}</span>
                              <span className="text-gray-500 truncate max-w-xs">{it.product?.title || it.title}</span>
                            </div>
                            <div className="font-semibold text-[11px]">
                              {verifiedCount} / {reqCount} verified
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. Packaging & Volumetric Weight Calculator */}
                <div className="border border-border rounded-lg p-3 bg-white space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-ink">Package Dimensions & Carrier Rates</div>
                    {/* Box Preset Selectors */}
                    <div className="flex gap-1 text-[10.5px]">
                      {['Standard Flyer (500g)', 'Small Box (1 Kg)', 'Medium Box (2 Kg)'].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => handleBoxPresetChange(b)}
                          className={`px-2 py-0.5 rounded border text-[10px] font-medium cursor-pointer ${
                            packagingDetails.boxType === b
                              ? 'bg-accent text-white border-accent'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {b.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Courier Carrier</label>
                      <select
                        value={packagingDetails.carrier}
                        onChange={(e) => setPackagingDetails((p) => ({ ...p, carrier: e.target.value }))}
                        className="w-full h-7 text-xs bg-white border border-border rounded px-1.5 mt-0.5"
                      >
                        <option value="Delhivery">Delhivery</option>
                        <option value="Bluedart">Bluedart Express</option>
                        <option value="Ecom Express">Ecom Express</option>
                        <option value="Xpressbees">Xpressbees</option>
                        <option value="Shadowfax">Shadowfax</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Physical Weight (Kg)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={packagingDetails.packageWeightKg}
                        onChange={(e) => setPackagingDetails((p) => ({ ...p, packageWeightKg: e.target.value }))}
                        className="w-full h-7 text-xs bg-white border border-border rounded px-2 mt-0.5"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">L × B × H (cm)</label>
                      <div className="flex items-center space-x-1 mt-0.5">
                        <input
                          type="number"
                          value={packagingDetails.packageLengthCm}
                          onChange={(e) => setPackagingDetails((p) => ({ ...p, packageLengthCm: e.target.value }))}
                          className="w-1/3 h-7 text-xs bg-white border border-border rounded px-1 text-center"
                          title="Length"
                        />
                        <span>×</span>
                        <input
                          type="number"
                          value={packagingDetails.packageBreadthCm}
                          onChange={(e) => setPackagingDetails((p) => ({ ...p, packageBreadthCm: e.target.value }))}
                          className="w-1/3 h-7 text-xs bg-white border border-border rounded px-1 text-center"
                          title="Breadth"
                        />
                        <span>×</span>
                        <input
                          type="number"
                          value={packagingDetails.packageHeightCm}
                          onChange={(e) => setPackagingDetails((p) => ({ ...p, packageHeightCm: e.target.value }))}
                          className="w-1/3 h-7 text-xs bg-white border border-border rounded px-1 text-center"
                          title="Height"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-1.5 rounded border border-gray-200 text-center flex flex-col justify-center">
                      <div className="text-[9.5px] uppercase font-bold text-gray-400">Billable Weight</div>
                      <div className="font-mono font-bold text-ink text-xs">
                        {billableWeightKg} kg
                      </div>
                      <div className="text-[9px] text-emerald-700 font-semibold">
                        Est. ₹{estimatedShippingCost}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Action Footer */}
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={handleBookShipment}
                    disabled={bookingShipment}
                    className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    <span>🏷️</span>
                    <span>{bookingShipment ? 'Generating AWB...' : 'Pack & Book Shipment'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <span className="text-3xl mb-2">📦</span>
                <span className="text-sm font-semibold text-ink">No Active Order Selected</span>
                <span className="text-xs text-gray-500 max-w-sm mt-1">
                  Select an order awaiting packing from the queue on the left to begin barcode verification.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'shipping' && (
        <DataTable
          columns={shipmentColumns}
          data={shipments}
          loading={loading}
          minWidth="850px"
          toolbar={
            <TableToolbar
              left={
                <SearchBar
                  value={search}
                  onChange={(v) => setSearch(v)}
                  onClear={() => setSearch('')}
                  placeholder="Search AWB or order number..."
                />
              }
              right={
                <span className="text-xs font-semibold text-gray-500">
                  {selectedShipmentIdsForManifest.length} parcel(s) selected
                </span>
              }
            />
          }
          pagination={{
            page: shipmentPagination.page,
            limit: shipmentPagination.limit,
            total: shipmentPagination.total,
            totalPages: shipmentPagination.totalPages,
            onPageChange: (p) => fetchShipments(p),
            itemName: 'shipments',
          }}
          emptyState={{
            icon: '🚚',
            title: 'No Shipments Found',
            description: 'Pack orders in the Packing Station to generate AWBs and book carrier shipments.',
          }}
        />
      )}

      {activeTab === 'audit' && (
        <DataTable
          columns={auditColumns}
          data={auditLogs}
          loading={loading}
          minWidth="750px"
          toolbar={
            <TableToolbar
              left={
                <div className="text-xs font-bold text-gray-600">
                  Authoritative Immutable Log for Audit & Compliance
                </div>
              }
            />
          }
          pagination={{
            page: auditPagination.page,
            limit: auditPagination.limit,
            total: auditPagination.total,
            totalPages: auditPagination.totalPages,
            onPageChange: (p) => fetchAuditLogs(p),
            itemName: 'audit events',
          }}
          emptyState={{
            icon: '📋',
            title: 'No Audit Records',
            description: 'Warehouse actions, picks, packs, and dispatches are immutably logged here.',
          }}
        />
      )}

      {/* ========================================================
          MODAL 1: Create Wave Picklist Modal
          ======================================================== */}
      {isWaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-border w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-gray-50">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                Create Wave Picklist
              </h3>
              <button
                onClick={() => setIsWaveModalOpen(false)}
                className="text-gray-400 hover:text-ink text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 space-y-3 overflow-auto flex-1 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Warehouse</label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full h-8 text-xs bg-white border border-border rounded px-2 mt-0.5"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">
                    Eligible Orders ({eligibleOrders.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedOrderIds.length === eligibleOrders.length) setSelectedOrderIds([]);
                      else setSelectedOrderIds(eligibleOrders.map((o) => o.id));
                    }}
                    className="text-[10.5px] font-semibold text-accent hover:underline cursor-pointer"
                  >
                    {selectedOrderIds.length === eligibleOrders.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="border border-border rounded max-h-52 overflow-auto divide-y divide-gray-100">
                  {eligibleOrders.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-xs">
                      No pending confirmed orders found for wave picking.
                    </div>
                  ) : (
                    eligibleOrders.map((o) => {
                      const checked = selectedOrderIds.includes(o.id);
                      return (
                        <label
                          key={o.id}
                          className="p-2 flex items-center space-x-2.5 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedOrderIds((prev) => [...prev, o.id]);
                              else setSelectedOrderIds((prev) => prev.filter((id) => id !== o.id));
                            }}
                            className="rounded border-gray-300 text-accent h-3.5 w-3.5"
                          />
                          <div className="flex-1">
                            <div className="font-mono font-bold text-ink">{o.platformOrderId || o.orderNumber}</div>
                            <div className="text-[10px] text-gray-500">
                              {o.buyerName} &bull; {o.items?.length || 0} line items
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-border flex justify-end space-x-2 bg-gray-50">
              <button
                onClick={() => setIsWaveModalOpen(false)}
                className="h-7 px-3 rounded border border-border text-xs text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWavePicklist}
                disabled={generatingWave || selectedOrderIds.length === 0}
                className="h-7 px-4 rounded bg-accent hover:bg-accent-hover text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {generatingWave ? 'Creating Wave...' : `Generate Wave (${selectedOrderIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: Interactive Picklist Sheet / Drawer
          ======================================================== */}
      {isPickDrawerOpen && selectedPicklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-border w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center space-x-2">
                  <span>Pick Sheet: {selectedPicklist.code}</span>
                  <StatusBadge status={selectedPicklist.status} />
                </h3>
                <div className="text-[10.5px] text-gray-500 mt-0.5">
                  Assigned: {selectedPicklist.pickerName || 'Warehouse Staff'} &bull; Warehouse: {selectedPicklist.warehouse?.name || 'Primary'}
                </div>
              </div>
              <button
                onClick={() => setIsPickDrawerOpen(false)}
                className="text-gray-400 hover:text-ink text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 overflow-auto flex-1 space-y-2">
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-left text-xs text-ink">
                  <thead className="bg-gray-50 uppercase text-[9.5px] font-bold text-gray-500 border-b border-border">
                    <tr>
                      <th className="py-2 px-2.5">Location / Bin</th>
                      <th className="py-2 px-2.5">SKU & Item Name</th>
                      <th className="py-2 px-2.5 text-center">Required</th>
                      <th className="py-2 px-2.5 text-center">Picked</th>
                      <th className="py-2 px-2.5 text-right">Pick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(selectedPicklist.items || []).map((it) => {
                      const isComplete = it.quantityPicked >= it.quantityRequired;
                      return (
                        <tr
                          key={it.id}
                          className={`hover:bg-gray-50/50 ${
                            isComplete ? 'bg-emerald-50/40 text-gray-600' : ''
                          }`}
                        >
                          <td className="py-2 px-2.5 font-mono font-bold text-accent text-[11px]">
                            {it.locationBin || 'A1-R1-B1'}
                          </td>
                          <td className="py-2 px-2.5">
                            <div className="font-mono font-bold text-ink text-[11px]">{it.sku}</div>
                            <div className="text-gray-500 text-[10px] truncate max-w-xs">{it.title}</div>
                          </td>
                          <td className="py-2 px-2.5 font-bold text-center text-[11px]">
                            {it.quantityRequired}
                          </td>
                          <td className="py-2 px-2.5 font-bold text-center text-[11px]">
                            <span className={isComplete ? 'text-emerald-700' : 'text-amber-700'}>
                              {it.quantityPicked}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-right">
                            {isComplete ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                ✓ Picked
                              </span>
                            ) : (
                              <button
                                onClick={() => handleRecordPick(it.id, it.quantityPicked, it.quantityRequired)}
                                className="h-6 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10.5px] font-semibold cursor-pointer"
                              >
                                + Pick 1
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 border-t border-border flex justify-between items-center bg-gray-50">
              <button
                onClick={() => window.print()}
                className="h-7 px-3 rounded border border-border text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                🖨️ Print Pick Sheet
              </button>
              <button
                onClick={() => setIsPickDrawerOpen(false)}
                className="h-7 px-4 rounded bg-ink text-white text-xs font-semibold hover:bg-gray-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: Printable Shipping Label
          ======================================================== */}
      {activeLabelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-border w-full max-w-sm flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-gray-50">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                Official Shipping Label (AWB)
              </h3>
              <button
                onClick={() => setActiveLabelModal(null)}
                className="text-gray-400 hover:text-ink text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Simulated 4x6 inch Shipping Label */}
            <div className="p-4 space-y-3 font-sans text-xs bg-white border-2 border-dashed border-gray-300 m-3 rounded">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-black text-sm text-ink">{activeLabelModal.carrier?.toUpperCase()}</span>
                <span className="text-[10px] uppercase font-bold text-gray-500">STANDARD EXPEDITED</span>
              </div>

              {/* Barcode Graphic Simulation */}
              <div className="text-center py-2 bg-gray-50 rounded border border-gray-200">
                <div className="font-mono text-base font-black tracking-widest text-ink">
                  ||| | | |||| | ||||| ||| ||| |
                </div>
                <div className="font-mono font-bold text-xs tracking-wider text-ink mt-1">
                  {activeLabelModal.awbNumber}
                </div>
              </div>

              <div className="border-t pt-2 space-y-1 text-[11px]">
                <div className="font-bold text-ink uppercase text-[10px] text-gray-500">SHIP TO:</div>
                <div className="font-bold text-ink">{activeLabelModal.order?.buyerName || 'Valued Customer'}</div>
                <div className="text-gray-600">
                  {activeLabelModal.order?.buyerAddress || activeLabelModal.order?.buyerCity || 'Delivery Address'}
                </div>
                <div className="text-gray-600">
                  {activeLabelModal.order?.buyerCity}, {activeLabelModal.order?.buyerState} - {activeLabelModal.order?.buyerPincode || '400001'}
                </div>
              </div>

              <div className="border-t pt-2 grid grid-cols-2 gap-2 text-[10.5px]">
                <div>
                  <span className="text-gray-400 block text-[9.5px]">ORDER NO</span>
                  <span className="font-mono font-bold text-ink">
                    {activeLabelModal.order?.platformOrderId || activeLabelModal.order?.orderNumber || 'ORD-REF'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[9.5px]">BILLABLE WT</span>
                  <span className="font-mono font-bold text-ink">{activeLabelModal.billableWeightKg || 0.5} kg</span>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-border flex justify-end space-x-2 bg-gray-50">
              <button
                onClick={() => window.print()}
                className="h-7 px-3 rounded bg-accent hover:bg-accent-hover text-white text-xs font-semibold cursor-pointer"
              >
                🖨️ Print Label (4×6)
              </button>
              <button
                onClick={() => setActiveLabelModal(null)}
                className="h-7 px-3 rounded border border-border text-xs text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: Create Manifest Modal
          ======================================================== */}
      {isManifestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-border w-full max-w-md flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-gray-50">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                Generate Carrier Handover Manifest
              </h3>
              <button
                onClick={() => setIsManifestModalOpen(false)}
                className="text-gray-400 hover:text-ink text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Selected Carrier</label>
                <select
                  value={manifestFormData.carrier}
                  onChange={(e) => setManifestFormData((p) => ({ ...p, carrier: e.target.value }))}
                  className="w-full h-8 text-xs bg-white border border-border rounded px-2 mt-0.5"
                >
                  <option value="Delhivery">Delhivery</option>
                  <option value="Bluedart">Bluedart Express</option>
                  <option value="Ecom Express">Ecom Express</option>
                  <option value="Xpressbees">Xpressbees</option>
                  <option value="Shadowfax">Shadowfax</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Pickup Driver Name</label>
                <input
                  type="text"
                  value={manifestFormData.driverName}
                  onChange={(e) => setManifestFormData((p) => ({ ...p, driverName: e.target.value }))}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full h-8 text-xs bg-white border border-border rounded px-2 mt-0.5"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Driver Contact Phone</label>
                <input
                  type="text"
                  value={manifestFormData.driverPhone}
                  onChange={(e) => setManifestFormData((p) => ({ ...p, driverPhone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full h-8 text-xs bg-white border border-border rounded px-2 mt-0.5"
                />
              </div>

              <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                ⚠️ Handing over {selectedShipmentIdsForManifest.length} parcel(s) will automatically advance their order statuses to <strong>SHIPPED</strong> and credit inventory ledger fulfillment.
              </div>
            </div>

            <div className="p-3 border-t border-border flex justify-end space-x-2 bg-gray-50">
              <button
                onClick={() => setIsManifestModalOpen(false)}
                className="h-7 px-3 rounded border border-border text-xs text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateManifest}
                disabled={generatingManifest}
                className="h-7 px-4 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
              >
                {generatingManifest ? 'Generating...' : 'Sign & Generate Manifest'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 5: Printable Manifest Sheet
          ======================================================== */}
      {activeManifestPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-border w-full max-w-xl flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-gray-50">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                Official Carrier Handover Sheet
              </h3>
              <button
                onClick={() => setActiveManifestPrint(null)}
                className="text-gray-400 hover:text-ink text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 font-sans text-xs bg-white m-3 border border-gray-300 rounded">
              <div className="flex justify-between items-start border-b pb-2">
                <div>
                  <h2 className="text-sm font-black text-ink">{activeManifestPrint.carrier?.toUpperCase()} HANDOVER MANIFEST</h2>
                  <div className="font-mono text-xs font-bold text-accent">{activeManifestPrint.manifestNumber}</div>
                </div>
                <div className="text-right text-[10.5px] text-gray-600">
                  <div>Warehouse: {activeManifestPrint.warehouse?.name || 'Central Warehouse'}</div>
                  <div>Date: {new Date(activeManifestPrint.handedOverAt || activeManifestPrint.createdAt).toLocaleDateString('en-IN')}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50 p-2 rounded border border-gray-200">
                <div>Driver: <strong>{activeManifestPrint.driverName || 'Pickup Personnel'}</strong></div>
                <div>Phone: <strong>{activeManifestPrint.driverPhone || 'N/A'}</strong></div>
                <div>Total Parcels: <strong>{activeManifestPrint.totalParcels || 0}</strong></div>
                <div>Status: <strong className="text-emerald-700 uppercase">HANDED OVER</strong></div>
              </div>

              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-[9px] font-bold">
                    <tr>
                      <th className="p-1.5">Sr.</th>
                      <th className="p-1.5">AWB Tracking Number</th>
                      <th className="p-1.5">Order Ref</th>
                      <th className="p-1.5 text-right">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(activeManifestPrint.shipments || []).map((sh, idx) => (
                      <tr key={sh.id || idx}>
                        <td className="p-1.5">{idx + 1}</td>
                        <td className="p-1.5 font-mono font-bold text-ink">{sh.awbNumber}</td>
                        <td className="p-1.5 font-mono">{sh.order?.platformOrderId || sh.order?.orderNumber || 'ORD'}</td>
                        <td className="p-1.5 text-right font-mono">{sh.billableWeightKg || 0.5} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-6 text-[10px] text-gray-500">
                <div className="border-t border-gray-400 pt-1 text-center">
                  Dispatcher Signature (Orderly Staff)
                </div>
                <div className="border-t border-gray-400 pt-1 text-center">
                  Driver Signature ({activeManifestPrint.carrier})
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-border flex justify-end space-x-2 bg-gray-50">
              <button
                onClick={() => window.print()}
                className="h-7 px-3 rounded bg-accent hover:bg-accent-hover text-white text-xs font-semibold cursor-pointer"
              >
                🖨️ Print Handover Sheet
              </button>
              <button
                onClick={() => setActiveManifestPrint(null)}
                className="h-7 px-3 rounded border border-border text-xs text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 6: Audit Event JSON State Diff
          ======================================================== */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-border w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-gray-50">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                Audit Event Snapshot: {selectedAuditLog.action}
              </h3>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="text-gray-400 hover:text-ink text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 overflow-auto flex-1 text-xs space-y-2">
              <div className="flex justify-between text-gray-500 text-[11px]">
                <span>Entity: <strong>{selectedAuditLog.entityType} ({selectedAuditLog.entityId})</strong></span>
                <span>Actor: <strong>{selectedAuditLog.actorName}</strong></span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">After State Snapshot:</span>
                <pre className="p-2 mt-0.5 bg-gray-900 text-emerald-400 rounded text-[10.5px] font-mono overflow-auto max-h-48">
                  {JSON.stringify(selectedAuditLog.afterState || {}, null, 2)}
                </pre>
              </div>

              {selectedAuditLog.metadata && Object.keys(selectedAuditLog.metadata).length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Event Metadata:</span>
                  <pre className="p-2 mt-0.5 bg-gray-100 text-gray-800 rounded text-[10.5px] font-mono overflow-auto max-h-32 border border-gray-200">
                    {JSON.stringify(selectedAuditLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border flex justify-end bg-gray-50">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="h-7 px-4 rounded bg-ink text-white text-xs font-semibold hover:bg-gray-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
