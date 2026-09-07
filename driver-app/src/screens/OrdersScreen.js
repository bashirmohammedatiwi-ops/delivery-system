import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
} from 'react-native';
import { useTabNav } from '../context/TabNavContext';
import { useAppData } from '../context/AppDataContext';
import { isDeferredOrder } from '../utils/format';
import {
  searchOrders,
  sortOrders,
  filterByRegion,
  getUniqueRegions,
  calcOrdersTotalIQD,
  calcOrdersAmountDue,
  SORT_OPTIONS,
} from '../utils/orderUtils';
import AppHeader from '../components/AppHeader';
import OrderCard from '../components/OrderCard';
import EmptyState from '../components/EmptyState';
import SegmentControl from '../components/SegmentControl';
import SearchBar from '../components/SearchBar';
import SortMenu from '../components/SortMenu';
import RegionFilter from '../components/RegionFilter';
import OrdersSummaryBar from '../components/OrdersSummaryBar';
import { SkeletonList } from '../components/SkeletonLoader';
import { THEME } from '../theme';

export default function OrdersScreen({ navigation, initialFilter = 'all' }) {
  const { ordersFilter, setOrdersFilter } = useTabNav();
  const { orders, deferredCount, activeCount, loading, refresh } = useAppData();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(initialFilter || ordersFilter || 'all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('default');
  const [region, setRegion] = useState('all');

  useEffect(() => {
    if (initialFilter && initialFilter !== filter) setFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    if (ordersFilter && ordersFilter !== filter) setFilter(ordersFilter);
  }, [ordersFilter]);

  const regions = useMemo(() => getUniqueRegions(orders), [orders]);

  const filteredOrders = useMemo(() => {
    let list = orders.filter((o) => {
      const deferred = isDeferredOrder(o);
      if (filter === 'deferred') return deferred;
      if (filter === 'active') return !deferred;
      return true;
    });
    list = filterByRegion(list, region);
    list = searchOrders(list, search);
    list = sortOrders(list, sortKey);
    return list;
  }, [orders, filter, region, search, sortKey]);

  const segmentOptions = [
    { key: 'all', label: 'الكل', count: orders.length },
    { key: 'active', label: 'نشطة', count: activeCount },
    { key: 'deferred', label: 'مؤجلة', count: deferredCount },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleFilterChange = (next) => {
    setFilter(next);
    setOrdersFilter(next);
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="طلباتي"
        subtitle={`${orders.length} طلب — ${activeCount} نشطة${deferredCount ? ` • ${deferredCount} مؤجلة` : ''}`}
        compact
      />

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="بحث برقم الشحنة، العميل، العنوان..."
        onClear={() => setSearch('')}
      />

      <SegmentControl options={segmentOptions} value={filter} onChange={handleFilterChange} />
      <RegionFilter regions={regions} value={region} onChange={setRegion} />
      <SortMenu options={SORT_OPTIONS} value={sortKey} onChange={setSortKey} />

      <OrdersSummaryBar
        count={filteredOrders.length}
        totalIQD={calcOrdersTotalIQD(filteredOrders)}
        amountDue={calcOrdersAmountDue(filteredOrders)}
      />

      {search ? (
        <Text style={styles.resultHint}>
          {filteredOrders.length} نتيجة للبحث «{search}»
        </Text>
      ) : null}

      {loading && orders.length === 0 ? (
        <SkeletonList count={5} />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={search ? 'search-outline' : filter === 'deferred' ? 'pause-circle-outline' : 'cube-outline'}
          title={search ? 'لا توجد نتائج' : filter === 'deferred' ? 'لا توجد طلبات مؤجلة' : 'لا توجد طلبات'}
          subtitle={
            search
              ? 'جرّب كلمة بحث مختلفة'
              : region !== 'all'
                ? 'لا توجد طلبات في هذه المنطقة'
                : filter === 'deferred'
                  ? 'يمكنك تأجيل طلب من تفاصيله مع كتابة السبب'
                  : 'استلم طلباً جديداً من زر الاستلام'
          }
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.OrderID)}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => navigation.navigate('OrderDetail', { order: item })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  list: { paddingHorizontal: THEME.spaceLg, paddingBottom: THEME.space3xl },
  resultHint: {
    fontSize: THEME.fontSm,
    color: THEME.textMuted,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: THEME.spaceSm,
    paddingHorizontal: THEME.spaceLg,
  },
});
