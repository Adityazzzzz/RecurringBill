import { Text, View, Pressable, Image, ScrollView, Switch, Alert, Modal } from 'react-native'
import { SafeAreaView } from "react-native-safe-area-context";
import { useClerk, useUser } from '@clerk/expo';
import images from '@/constants/images';
import { usePostHog } from 'posthog-react-native';
import { useSubscriptionStore } from '@/lib/subscriptionStore';
import { useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import dayjs from 'dayjs';

const Settings = () => {
    const { signOut } = useClerk();
    const { user } = useUser();
    const posthog = usePostHog();

    const {
        subscriptions,
        baseCurrency,
        theme,
        pushNotificationsEnabled,
        emailNotificationsEnabled,
        reminderOffsetDays,
        setBaseCurrency,
        setTheme,
        setPushNotificationsEnabled,
        setEmailNotificationsEnabled,
        setReminderOffsetDays,
        setSubscriptions,
    } = useSubscriptionStore();

    // Modal visibility states
    const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
    const [reminderModalVisible, setReminderModalVisible] = useState(false);

    // Dynamic metrics calculation
    const activeCount = useMemo(() => {
        return subscriptions.filter(sub => sub.status === 'active').length;
    }, [subscriptions]);

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

    const handleSignOut = async () => {
        posthog.capture('user_signed_out');
        try {
            await signOut();
            posthog.reset();
        } 
        catch (error) {
            console.error('Sign-out failed:', error);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account ⚠️",
            "Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            posthog.capture('user_account_deleted');
                            await user?.delete();
                            posthog.reset();
                        } catch (error) {
                            console.error('Delete account failed:', error);
                            Alert.alert('Error', 'Failed to delete account. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    const handleClearData = () => {
        Alert.alert(
            "Clear All Subscriptions",
            "This will delete all subscriptions tracked locally. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: () => {
                        setSubscriptions([]);
                        posthog.capture('local_data_cleared');
                        Alert.alert('Success', 'Data cleared successfully.');
                    }
                }
            ]
        );
    };

    const handleExportPDF = async () => {
        try {
            const formattedTotal = formatCurrency(totalMonthlySpend, 'USD', baseCurrency);
            
            const rows = subscriptions.map(sub => `
                <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <td style="padding: 12px; font-weight: bold; color: #081126;">${sub.name}</td>
                    <td style="padding: 12px; color: #64748b;">${sub.plan || 'N/A'}</td>
                    <td style="padding: 12px; color: #64748b;">${sub.category || 'N/A'}</td>
                    <td style="padding: 12px; font-weight: bold; color: #081126;">${formatCurrency(sub.price, sub.currency || 'USD', baseCurrency)}</td>
                    <td style="padding: 12px; color: #64748b;">${sub.billing}</td>
                    <td style="padding: 12px; color: #64748b;">${sub.renewalDate ? dayjs(sub.renewalDate).format('MM/DD/YYYY') : 'N/A'}</td>
                    <td style="padding: 12px;">
                        <span style="
                            padding: 4px 8px; 
                            border-radius: 9999px; 
                            font-size: 11px; 
                            font-weight: bold;
                            background-color: ${sub.status === 'active' ? '#e2f7f1' : sub.status === 'paused' ? '#fff9e6' : '#ffebeb'};
                            color: ${sub.status === 'active' ? '#14a37f' : sub.status === 'paused' ? '#b88900' : '#d93838'};
                        ">
                            ${sub.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                    </td>
                </tr>
            `).join('');

            const html = `
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        body {
                            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                            padding: 24px;
                            color: #081126;
                            background-color: #fff9e3;
                        }
                        .header {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            border-bottom: 2px solid #ea7a53;
                            padding-bottom: 16px;
                            margin-bottom: 24px;
                        }
                        .title {
                            font-size: 28px;
                            font-weight: bold;
                            color: #081126;
                        }
                        .date {
                            font-size: 14px;
                            color: #64748b;
                        }
                        .summary-container {
                            display: flex;
                            gap: 16px;
                            margin-bottom: 24px;
                        }
                        .summary-card {
                            flex: 1;
                            background-color: #fff8e7;
                            border: 1px solid rgba(0, 0, 0, 0.1);
                            border-radius: 12px;
                            padding: 16px;
                            text-align: center;
                        }
                        .summary-value {
                            font-size: 20px;
                            font-weight: bold;
                            color: #ea7a53;
                            margin-top: 4px;
                        }
                        .summary-label {
                            font-size: 12px;
                            color: #64748b;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            background-color: #ffffff;
                            border-radius: 12px;
                            overflow: hidden;
                            border: 1px solid rgba(0, 0, 0, 0.1);
                        }
                        th {
                            background-color: #081126;
                            color: #ffffff;
                            text-align: left;
                            padding: 12px;
                            font-size: 14px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <div class="title">Recurrly Report</div>
                            <div style="font-size: 14px; color: #ea7a53; font-weight: bold; margin-top: 4px;">Subscription Manager</div>
                        </div>
                        <div class="date">${dayjs().format('MMMM DD, YYYY')}</div>
                    </div>
                    
                    <div class="summary-container">
                        <div class="summary-card">
                            <div class="summary-label">Monthly Spend</div>
                            <div class="summary-value">${formattedTotal}</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-label">Active Tracks</div>
                            <div class="summary-value">${activeCount}</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-label">Total Tracks</div>
                            <div class="summary-value">${subscriptions.length}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Plan</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Cycle</th>
                                <th>Next Renewal</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, {
                UTI: '.pdf',
                mimeType: 'application/pdf',
                dialogTitle: 'Export Subscriptions Report',
            });
            posthog.capture('subscriptions_report_exported', { format: 'pdf' });
        } catch (error) {
            console.error('Failed to export PDF:', error);
            Alert.alert('Error', 'Failed to generate PDF report.');
        }
    };

    const displayName = user?.firstName || user?.fullName || user?.emailAddresses[0]?.emailAddress || 'User';
    const email = user?.emailAddresses[0]?.emailAddress;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                <Text className="text-3xl font-sans-bold text-primary mb-6">Settings</Text>

                {/* Profile Header Card */}
                <View className="auth-card mb-5">
                    <View className="flex-row items-center gap-4 mb-4">
                        <Image
                            source={user?.imageUrl ? { uri: user.imageUrl } : images.avatar}
                            className="size-16 rounded-full"
                        />
                        <View className="flex-1">
                            <Text className="text-lg font-sans-bold text-primary">{displayName}</Text>
                            {email && (
                                <Text className="text-sm font-sans-medium text-muted-foreground">{email}</Text>
                            )}
                        </View>
                    </View>

                    {/* Spend Metrics Summary Row */}
                    <View className="flex-row border-t border-border/10 pt-4 mt-2 justify-around">
                        <View className="items-center">
                            <Text className="text-sm font-sans-semibold text-muted-foreground">Active Bills</Text>
                            <Text className="text-lg font-sans-bold text-accent">{activeCount}</Text>
                        </View>
                        <View className="h-8 w-[1px] bg-border/20 self-center" />
                        <View className="items-center">
                            <Text className="text-sm font-sans-semibold text-muted-foreground">Monthly Commitment</Text>
                            <Text className="text-lg font-sans-bold text-primary">
                                {formatCurrency(totalMonthlySpend, 'USD', baseCurrency)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Preferences Section */}
                <View className="auth-card mb-5">
                    <Text className="text-base font-sans-semibold text-primary mb-3">Preferences</Text>
                    <View className="gap-2">
                        {/* Currency Selector Button */}
                        <Pressable 
                            className="flex-row justify-between items-center py-2"
                            onPress={() => setCurrencyModalVisible(true)}
                        >
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="cash-outline" size={20} color="#ea7a53" />
                                <Text className="text-sm font-sans-semibold text-primary">Primary Currency</Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                                <Text className="text-sm font-sans-medium text-muted-foreground">{baseCurrency}</Text>
                                <Ionicons name="chevron-forward" size={16} color="rgba(0, 0, 0, 0.4)" />
                            </View>
                        </Pressable>

                        {/* Theme Settings Selector */}
                        <View className="flex-row justify-between items-center py-2">
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="color-palette-outline" size={20} color="#ea7a53" />
                                <Text className="text-sm font-sans-semibold text-primary">App Theme</Text>
                            </View>
                            <View className="flex-row gap-1 bg-border/20 p-1 rounded-xl">
                                {['system', 'light', 'dark'].map((t) => (
                                    <Pressable
                                        key={t}
                                        className={`px-3 py-1.5 rounded-lg ${theme === t ? 'bg-accent' : 'bg-transparent'}`}
                                        onPress={() => setTheme(t)}
                                    >
                                        <Text className={`text-xs font-sans-bold capitalize ${theme === t ? 'text-white' : 'text-primary/70'}`}>
                                            {t}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Notifications Section */}
                <View className="auth-card mb-5">
                    <Text className="text-base font-sans-semibold text-primary mb-3">Notifications</Text>
                    <View className="gap-2">
                        {/* Push Notifications Switch */}
                        <View className="flex-row justify-between items-center py-2">
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="notifications-outline" size={20} color="#ea7a53" />
                                <Text className="text-sm font-sans-semibold text-primary">Push Alerts</Text>
                            </View>
                            <Switch 
                                value={pushNotificationsEnabled}
                                onValueChange={setPushNotificationsEnabled}
                                trackColor={{ false: '#f6eecf', true: '#ea7a53' }}
                                thumbColor={pushNotificationsEnabled ? '#fff9e3' : '#ea7a53'}
                            />
                        </View>

                        {/* Email Notifications Switch */}
                        <View className="flex-row justify-between items-center py-2">
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="mail-outline" size={20} color="#ea7a53" />
                                <Text className="text-sm font-sans-semibold text-primary">Email Reminders</Text>
                            </View>
                            <Switch 
                                value={emailNotificationsEnabled}
                                onValueChange={setEmailNotificationsEnabled}
                                trackColor={{ false: '#f6eecf', true: '#ea7a53' }}
                                thumbColor={emailNotificationsEnabled ? '#fff9e3' : '#ea7a53'}
                            />
                        </View>

                        {/* Reminder Window Selector */}
                        <Pressable 
                            className={`flex-row justify-between items-center py-2 ${!pushNotificationsEnabled && 'opacity-50'}`}
                            onPress={() => pushNotificationsEnabled && setReminderModalVisible(true)}
                            disabled={!pushNotificationsEnabled}
                        >
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="time-outline" size={20} color="#ea7a53" />
                                <Text className="text-sm font-sans-semibold text-primary">Reminder Period</Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                                <Text className="text-sm font-sans-medium text-muted-foreground">
                                    {reminderOffsetDays} day{reminderOffsetDays > 1 ? 's' : ''} before
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color="rgba(0, 0, 0, 0.4)" />
                            </View>
                        </Pressable>
                    </View>
                </View>

                {/* Data Section */}
                <View className="auth-card mb-5">
                    <Text className="text-base font-sans-semibold text-primary mb-3">Data Management</Text>
                    <View className="gap-2">
                        {/* Export PDF Report */}
                        <Pressable 
                            className="flex-row justify-between items-center py-2"
                            onPress={handleExportPDF}
                        >
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="document-text-outline" size={20} color="#ea7a53" />
                                <Text className="text-sm font-sans-semibold text-primary">Export Report (PDF)</Text>
                            </View>
                            <Ionicons name="download-outline" size={16} color="rgba(0, 0, 0, 0.4)" />
                        </Pressable>

                        {/* Reset Local Data */}
                        <Pressable 
                            className="flex-row justify-between items-center py-2"
                            onPress={handleClearData}
                        >
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="trash-outline" size={20} color="#dc2626" />
                                <Text className="text-sm font-sans-semibold text-destructive">Reset Local Storage</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="rgba(0, 0, 0, 0.4)" />
                        </Pressable>
                    </View>
                </View>

                {/* Clerk User Security Info */}
                <View className="auth-card mb-5">
                    <Text className="text-base font-sans-semibold text-primary mb-3">Security & Account</Text>
                    <View className="gap-2">
                        <View className="flex-row justify-between items-center py-2">
                            <Text className="text-sm font-sans-medium text-muted-foreground">User ID</Text>
                            <Text className="text-sm font-sans-medium text-primary" numberOfLines={1} ellipsizeMode="tail">
                                {user?.id?.substring(0, 20)}...
                            </Text>
                        </View>
                        <View className="flex-row justify-between items-center py-2">
                            <Text className="text-sm font-sans-medium text-muted-foreground">Joined</Text>
                            <Text className="text-sm font-sans-medium text-primary">
                                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Account Actions Section */}
                <View className="gap-3 mt-4">
                    <Pressable
                        className="auth-button bg-destructive"
                        onPress={handleSignOut}
                    >
                        <Text className="auth-button-text text-white">Sign Out</Text>
                    </Pressable>

                    <Pressable
                        className="items-center py-3"
                        onPress={handleDeleteAccount}
                    >
                        <Text className="text-sm font-sans-bold text-destructive">Delete Account Permanently</Text>
                    </Pressable>
                </View>
            </ScrollView>

            {/* Currency Selector Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={currencyModalVisible}
                onRequestClose={() => setCurrencyModalVisible(false)}
            >
                <Pressable className="modal-overlay justify-center items-center p-5" onPress={() => setCurrencyModalVisible(false)}>
                    <View className="w-full max-w-sm rounded-3xl bg-background border border-border p-5 gap-4">
                        <Text className="text-lg font-sans-bold text-primary">Select Currency</Text>
                        <View className="gap-2">
                            {[
                                { code: 'USD', label: 'USD ($)' },
                                { code: 'EUR', label: 'EUR (€)' },
                                { code: 'GBP', label: 'GBP (£)' },
                                { code: 'INR', label: 'INR (₹)' },
                            ].map((c) => (
                                <Pressable
                                    key={c.code}
                                    className={`picker-option ${baseCurrency === c.code ? 'picker-option-active' : ''}`}
                                    onPress={() => {
                                        setBaseCurrency(c.code);
                                        setCurrencyModalVisible(false);
                                        posthog.capture('base_currency_changed', { currency: c.code });
                                    }}
                                >
                                    <Text className={`picker-option-text ${baseCurrency === c.code ? 'picker-option-text-active' : ''}`}>
                                        {c.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </Pressable>
            </Modal>

            {/* Reminder Offset Selector Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={reminderModalVisible}
                onRequestClose={() => setReminderModalVisible(false)}
            >
                <Pressable className="modal-overlay justify-center items-center p-5" onPress={() => setReminderModalVisible(false)}>
                    <View className="w-full max-w-sm rounded-3xl bg-background border border-border p-5 gap-4">
                        <Text className="text-lg font-sans-bold text-primary">Select Reminder Window</Text>
                        <View className="gap-2">
                            {[1, 3, 5, 7].map((days) => (
                                <Pressable
                                    key={days}
                                    className={`picker-option ${reminderOffsetDays === days ? 'picker-option-active' : ''}`}
                                    onPress={() => {
                                        setReminderOffsetDays(days);
                                        setReminderModalVisible(false);
                                        posthog.capture('reminder_offset_changed', { offset_days: days });
                                    }}
                                >
                                    <Text className={`picker-option-text ${reminderOffsetDays === days ? 'picker-option-text-active' : ''}`}>
                                        {days} day{days > 1 ? 's' : ''} before renewal
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    )
}

export default Settings