import {FlatList, Image, Pressable, Text, View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import images from "@/constants/images";
import {HOME_BALANCE} from "@/constants/data";
import { icons } from "@/constants/icon";
import {formatCurrency} from "@/lib/utils";
import dayjs from "dayjs";
import ListHeading from "@/components/ListHeading";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import SubscriptionCard from "@/components/SubscriptionCard";
import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import {useState, useMemo} from "react";
import { useUser } from '@clerk/expo';
import { usePostHog } from 'posthog-react-native';
import { useSubscriptionStore } from "@/lib/subscriptionStore";

export default function App() {
    const { user } = useUser();
    const posthog = usePostHog();
    const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<string | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const { subscriptions, addSubscription, baseCurrency } = useSubscriptionStore();
 
    // Calculate dynamic monthly commitment converted to selected base currency
    const totalMonthlySpend = useMemo(() => {
        return subscriptions
            .filter(sub => sub.status === 'active')
            .reduce((total, sub) => {
                let monthlyPrice = sub.price;
                if (sub.billing === 'Yearly') {
                    monthlyPrice = sub.price / 12;
                } else if (sub.billing === 'Weekly') {
                    monthlyPrice = sub.price * 4.33;
                } else if (sub.billing === 'Daily') {
                    monthlyPrice = sub.price * 30;
                }
                
                const fromCurrency = sub.currency || 'USD';
                const toCurrency = baseCurrency;
                const EXCHANGE_RATES: Record<string, number> = {
                  USD: 1.0,
                  EUR: 0.92,
                  GBP: 0.79,
                  INR: 83.50,
                };
                const rateFrom = EXCHANGE_RATES[fromCurrency.toUpperCase()] || 1.0;
                const rateTo = EXCHANGE_RATES[toCurrency.toUpperCase()] || 1.0;
                const converted = (monthlyPrice / rateFrom) * rateTo;
                
                return total + converted;
            }, 0);
    }, [subscriptions, baseCurrency]);

    // Find the next closest renewal date among active subscriptions
    const nextRenewalDate = useMemo(() => {
        const activeSubs = subscriptions.filter(sub => sub.status === 'active' && sub.renewalDate);
        if (activeSubs.length === 0) return null;
        
        const sorted = [...activeSubs].sort((a, b) => 
            dayjs(a.renewalDate).diff(dayjs(b.renewalDate))
        );
        return sorted[0].renewalDate;
    }, [subscriptions]);

    // Get upcoming subscriptions (active subscriptions with renewal date within next 7 days)
    const upcomingSubscriptions = useMemo(() => {
        const now = dayjs();
        const nextWeek = now.add(7, 'days');
        return subscriptions
            .filter(sub =>
                sub.status === 'active' &&
                dayjs(sub.renewalDate).isAfter(now) &&
                dayjs(sub.renewalDate).isBefore(nextWeek)
            )
            .map(sub => ({
                ...sub,
                daysLeft: dayjs(sub.renewalDate).diff(now, 'day')
            }))
            .sort((a, b) => dayjs(a.renewalDate).diff(dayjs(b.renewalDate)));
    }, [subscriptions]);

    const handleSubscriptionPress = (item: Subscription) => {
        const isExpanding = expandedSubscriptionId !== item.id;
        setExpandedSubscriptionId((currentId) => (currentId === item.id ? null : item.id));
        posthog.capture(isExpanding ? 'subscription_expanded' : 'subscription_collapsed', {
            subscription_name: item.name,
            subscription_id: item.id,
        });
    };

    const handleCreateSubscription = (newSubscription: Subscription) => {
        addSubscription(newSubscription);
        posthog.capture('subscription_created', {
            subscription_name: newSubscription.name,
            subscription_price: newSubscription.price,
            subscription_frequency: newSubscription.frequency || '' ,
            subscription_category: newSubscription.category || 'Uncategorized',
        });
    };

    // Get user display name: firstName, fullName, or email
    const displayName = user?.firstName || user?.fullName || user?.emailAddresses[0]?.emailAddress || 'User';

    return (
        <SafeAreaView className="flex-1 bg-background p-5">
                <FlatList
                    ListHeaderComponent={() => (
                        <>
                            <View className="home-header">
                                <View className="home-user">
                                    <Image
                                        source={user?.imageUrl ? { uri: user.imageUrl } : images.avatar}
                                        className="home-avatar"
                                    />
                                    <Text className="home-user-name">{displayName}</Text>
                                </View>

                                <Pressable onPress={() => setIsModalVisible(true)}>
                                    <Image source={icons.add} className="home-add-icon" />
                                </Pressable>
                            </View>

                             <View className="home-balance-card">
                                <Text className="home-balance-label">Monthly Spend</Text>

                                <View className="home-balance-row">
                                    <Text className="home-balance-amount">
                                        {formatCurrency(totalMonthlySpend, 'USD', baseCurrency)}
                                    </Text>
                                    <Text className="home-balance-date">
                                        {nextRenewalDate ? `Next: ${dayjs(nextRenewalDate).format('MM/DD')}` : 'No renewals'}
                                    </Text>
                                </View>
                            </View>

                            <View className="mb-5">
                                <ListHeading title="Upcoming" />

                                <FlatList
                                    data={upcomingSubscriptions}
                                    renderItem={({ item }) => (<UpcomingSubscriptionCard {...item} />)}
                                    keyExtractor={(item) => item.id}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    ListEmptyComponent={<Text className="home-empty-state">No upcoming renewals yet.</Text>}
                                />
                            </View>

                            <ListHeading title="All Subscriptions" />
                        </>
                    )}
                    data={subscriptions}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <SubscriptionCard
                            {...item}
                            expanded={expandedSubscriptionId === item.id}
                            onPress={() => handleSubscriptionPress(item)}
                        />
                    )}
                    extraData={expandedSubscriptionId}
                    ItemSeparatorComponent={() => <View className="h-4" />}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<Text className="home-empty-state">No subscriptions yet.</Text>}
                    contentContainerStyle={{ paddingBottom: 120 }}
                />

            <CreateSubscriptionModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                onSubmit={handleCreateSubscription}
            />
        </SafeAreaView>
    );
}