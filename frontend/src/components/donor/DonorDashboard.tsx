// frontend/src/components/donor/DonorDashboard.tsx - Fixed with working Donation History
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { API_BASE_URL } from '../../config/api';
import StudentBrowser from './StudentBrowser';
import DonationForm from './DonationForm';
import DonationHistory from './DonationHistory'; // ADDED: Import DonationHistory

interface DonorDashboardProps {
  userData: any;
  onLogout: () => void;
}

interface DashboardStats {
  overview: {
    totalDonated: number;
    studentsSupported: number;
    recurringDonations: number;
    impactScore: number;
  };
  monthlyStats: {
    thisMonth: number;
    lastMonth: number;
    percentChange: number;
  };
  impactMetrics: {
    studentsHelped: number;
    studentsGraduated: number;
    itemsFunded: number;
    communityRank: string;
  };
  recentActivity: Array<{
    id: string;
    amount: number;
    studentName: string;
    studentPhoto?: string;
    date: string;
    message?: string;
  }>;
}

const DonorDashboard: React.FC<DonorDashboardProps> = ({ userData, onLogout }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStudentBrowser, setShowStudentBrowser] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [showDonationHistory, setShowDonationHistory] = useState(false); // ADDED: State for donation history
  const [preSelectedAmount, setPreSelectedAmount] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      console.log('Fetching dashboard stats with token:', userData.token);

      const response = await fetch(`${API_BASE_URL}/api/donors/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Dashboard stats response status:', response.status);
      const data = await response.json();
      console.log('Dashboard stats data:', data);

      if (data.success) {
        setStats(data.data);
      } else {
        console.error('Failed to fetch dashboard stats:', data.message);
        // Show simplified dashboard if API fails
        setStats({
          overview: {
            totalDonated: 0,
            studentsSupported: 0,
            recurringDonations: 0,
            impactScore: 0
          },
          monthlyStats: {
            thisMonth: 0,
            lastMonth: 0,
            percentChange: 0
          },
          impactMetrics: {
            studentsHelped: 0,
            studentsGraduated: 0,
            itemsFunded: 0,
            communityRank: 'New Donor'
          },
          recentActivity: []
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Show simplified dashboard if API fails
      setStats({
        overview: {
          totalDonated: 0,
          studentsSupported: 0,
          recurringDonations: 0,
          impactScore: 0
        },
        monthlyStats: {
          thisMonth: 0,
          lastMonth: 0,
          percentChange: 0
        },
        impactMetrics: {
          studentsHelped: 0,
          studentsGraduated: 0,
          itemsFunded: 0,
          communityRank: 'New Donor'
        },
        recentActivity: []
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  const formatCurrency = (amount: number) => {
    return `$${Number(amount).toFixed(2)}`;
  };

  const handleBrowseStudents = () => {
    setShowStudentBrowser(true);
  };

  const handleStudentSelect = (student: any) => {
    console.log('Student selected for donation:', student);
    setSelectedStudent(student);
    setPreSelectedAmount(undefined);
    setShowDonationForm(true);
  };

  const handleQuickDonation = (student: any, amount: number) => {
    console.log('Quick donation selected:', { student, amount });
    setSelectedStudent(student);
    setPreSelectedAmount(amount);
    setShowDonationForm(true);
  };

  const handleDonationComplete = (donation: any) => {
    Alert.alert(
      'Donation Successful! 🎉',
      `Thank you for your donation of $${(donation.amount / 100).toFixed(2)} to ${donation.student.firstName} ${donation.student.lastName}!`,
      [
        {
          text: 'OK',
          onPress: () => {
            setShowDonationForm(false);
            setSelectedStudent(null);
            setShowStudentBrowser(false);
            // Refresh dashboard to show new donation
            fetchDashboardStats();
          }
        }
      ]
    );
  };

  const handleDonationCancel = () => {
    setShowDonationForm(false);
    setSelectedStudent(null);
    // Stay on student browser
  };

  const handleBackToDashboard = () => {
    setShowStudentBrowser(false);
  };

  // UPDATED: Fixed donation history handler
  const handleViewHistory = () => {
    console.log('Opening donation history...');
    setShowDonationHistory(true);
  };

  // ADDED: Handler to go back from donation history
  const handleBackFromHistory = () => {
    setShowDonationHistory(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </View>
    );
  }

  // ADDED: Show donation history component
  if (showDonationHistory) {
    return (
      <DonationHistory
        token={userData.token}
        onBack={handleBackFromHistory}
      />
    );
  }

  if (showDonationForm && selectedStudent) {
    return (
      <DonationForm
        student={selectedStudent}
        token={userData.token}
        userData={userData}
        onDonationComplete={handleDonationComplete}
        onCancel={handleDonationCancel}
        preSelectedAmount={preSelectedAmount}
      />
    );
  }

  if (showStudentBrowser) {
    return (
      <StudentBrowser
        token={userData.token}
        onStudentSelect={handleStudentSelect}
        onBack={handleBackToDashboard}
        onQuickDonation={handleQuickDonation}
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back, {userData.firstName}!</Text>
          <Text style={styles.subtitleText}>Your impact dashboard</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Impact Summary */}
      {stats && (
        <View style={styles.impactSection}>
          <Text style={styles.sectionTitle}>Your Impact</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{formatCurrency(stats.overview.totalDonated)}</Text>
              <Text style={styles.statLabel}>Total Donated</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.overview.studentsSupported}</Text>
              <Text style={styles.statLabel}>Students Helped</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.overview.recurringDonations}</Text>
              <Text style={styles.statLabel}>Recurring Donations</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.overview.impactScore}</Text>
              <Text style={styles.statLabel}>Impact Score</Text>
            </View>
          </View>
        </View>
      )}

      {/* Monthly Progress */}
      {stats && (
        <View style={styles.monthlySection}>
          <Text style={styles.sectionTitle}>This Month</Text>
          <View style={styles.monthlyCard}>
            <View style={styles.monthlyStats}>
              <Text style={styles.monthlyAmount}>{formatCurrency(stats.monthlyStats.thisMonth)}</Text>
              <Text style={styles.monthlyLabel}>Donated this month</Text>
            </View>
            <View style={styles.monthlyChange}>
              <Text style={[
                styles.changeText,
                stats.monthlyStats.percentChange >= 0 ? styles.positiveChange : styles.negativeChange
              ]}>
                {stats.monthlyStats.percentChange >= 0 ? '+' : ''}{stats.monthlyStats.percentChange.toFixed(1)}%
              </Text>
              <Text style={styles.changeLabel}>vs last month</Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.browseButton]}
            onPress={handleBrowseStudents}
          >
            <Text style={styles.actionButtonText}>Browse Students</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.historyButton]}
            onPress={handleViewHistory}
          >
            <Text style={styles.actionButtonText}>Donation History</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      {stats && stats.recentActivity.length > 0 && (
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Recent Donations</Text>
          {stats.recentActivity.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{activity.studentName}</Text>
                <Text style={styles.activityDate}>
                  {new Date(activity.date).toLocaleDateString()}
                </Text>
                {activity.message && (
                  <Text style={styles.activityMessage}>{activity.message}</Text>
                )}
              </View>
              <View style={styles.activityAmount}>
                <Text style={styles.amountText}>{formatCurrency(activity.amount)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Impact Metrics */}
      {stats && (
        <View style={styles.impactMetricsSection}>
          <Text style={styles.sectionTitle}>Impact Breakdown</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{stats.impactMetrics.studentsGraduated}</Text>
              <Text style={styles.metricLabel}>Students Graduated</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{stats.impactMetrics.itemsFunded}</Text>
              <Text style={styles.metricLabel}>Items Funded</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{stats.impactMetrics.communityRank}</Text>
              <Text style={styles.metricLabel}>Community Rank</Text>
            </View>
          </View>
        </View>
      )}

      {/* Getting Started for New Donors */}
      {stats && stats.overview.totalDonated === 0 && (
        <View style={styles.gettingStartedSection}>
          <Text style={styles.sectionTitle}>Getting Started</Text>
          <Text style={styles.gettingStartedText}>
            Welcome to Village Platform! You're all set to start making a difference in students' lives.
          </Text>
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleBrowseStudents}
          >
            <Text style={styles.getStartedButtonText}>Make Your First Donation</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121824',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: 'rgba(25, 26, 45, 0.9)',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitleText: {
    fontSize: 16,
    color: '#a3b3ff',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  impactSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'rgba(25, 26, 45, 0.8)',
    padding: 16,
    borderRadius: 12,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34A853',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#a3b3ff',
    textAlign: 'center',
  },
  monthlySection: {
    padding: 20,
    paddingTop: 0,
  },
  monthlyCard: {
    backgroundColor: 'rgba(25, 26, 45, 0.8)',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthlyStats: {
    flex: 1,
  },
  monthlyAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  monthlyLabel: {
    fontSize: 14,
    color: '#a3b3ff',
    marginTop: 4,
  },
  monthlyChange: {
    alignItems: 'flex-end',
  },
  changeText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  positiveChange: {
    color: '#4BB543',
  },
  negativeChange: {
    color: '#ff6b6b',
  },
  changeLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  actionsSection: {
    padding: 20,
    paddingTop: 0,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  browseButton: {
    backgroundColor: '#34A853',
  },
  historyButton: {
    backgroundColor: '#4285F4',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  activitySection: {
    padding: 20,
    paddingTop: 0,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 26, 45, 0.6)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  activityDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  activityMessage: {
    fontSize: 14,
    color: '#a3b3ff',
    marginTop: 4,
  },
  activityAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34A853',
  },
  impactMetricsSection: {
    padding: 20,
    paddingTop: 0,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
    padding: 16,
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  metricLabel: {
    fontSize: 12,
    color: '#a3b3ff',
    marginTop: 4,
    textAlign: 'center',
  },
  gettingStartedSection: {
    padding: 20,
    paddingTop: 0,
  },
  gettingStartedText: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    marginBottom: 20,
  },
  getStartedButton: {
    backgroundColor: '#34A853',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  getStartedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DonorDashboard;



// // frontend/src/components/donor/DonorDashboard.tsx - Fixed to pass userData to DonationForm
// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   RefreshControl,
//   Alert
// } from 'react-native';
// import { API_BASE_URL } from '../../config/api';
// import StudentBrowser from './StudentBrowser';
// import DonationForm from './DonationForm';
//
// interface DonorDashboardProps {
//   userData: any;
//   onLogout: () => void;
// }
//
// interface DashboardStats {
//   overview: {
//     totalDonated: number;
//     studentsSupported: number;
//     recurringDonations: number;
//     impactScore: number;
//   };
//   monthlyStats: {
//     thisMonth: number;
//     lastMonth: number;
//     percentChange: number;
//   };
//   impactMetrics: {
//     studentsHelped: number;
//     studentsGraduated: number;
//     itemsFunded: number;
//     communityRank: string;
//   };
//   recentActivity: Array<{
//     id: string;
//     amount: number;
//     studentName: string;
//     studentPhoto?: string;
//     date: string;
//     message?: string;
//   }>;
// }
//
// const DonorDashboard: React.FC<DonorDashboardProps> = ({ userData, onLogout }) => {
//   const [stats, setStats] = useState<DashboardStats | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [showStudentBrowser, setShowStudentBrowser] = useState(false);
//   const [selectedStudent, setSelectedStudent] = useState<any>(null);
//   const [showDonationForm, setShowDonationForm] = useState(false);
//   const [preSelectedAmount, setPreSelectedAmount] = useState<number | undefined>(undefined);
//
//   useEffect(() => {
//     fetchDashboardStats();
//   }, []);
//
//   const fetchDashboardStats = async () => {
//     try {
//       console.log('Fetching dashboard stats with token:', userData.token);
//
//       const response = await fetch(`${API_BASE_URL}/api/donors/dashboard/stats`, {
//         headers: {
//           'Authorization': `Bearer ${userData.token}`,
//           'Content-Type': 'application/json'
//         }
//       });
//
//       console.log('Dashboard stats response status:', response.status);
//       const data = await response.json();
//       console.log('Dashboard stats data:', data);
//
//       if (data.success) {
//         setStats(data.data);
//       } else {
//         console.error('Failed to fetch dashboard stats:', data.message);
//         // Show simplified dashboard if API fails
//         setStats({
//           overview: {
//             totalDonated: 0,
//             studentsSupported: 0,
//             recurringDonations: 0,
//             impactScore: 0
//           },
//           monthlyStats: {
//             thisMonth: 0,
//             lastMonth: 0,
//             percentChange: 0
//           },
//           impactMetrics: {
//             studentsHelped: 0,
//             studentsGraduated: 0,
//             itemsFunded: 0,
//             communityRank: 'New Donor'
//           },
//           recentActivity: []
//         });
//       }
//     } catch (error) {
//       console.error('Error fetching dashboard stats:', error);
//       // Show simplified dashboard if API fails
//       setStats({
//         overview: {
//           totalDonated: 0,
//           studentsSupported: 0,
//           recurringDonations: 0,
//           impactScore: 0
//         },
//         monthlyStats: {
//           thisMonth: 0,
//           lastMonth: 0,
//           percentChange: 0
//         },
//         impactMetrics: {
//           studentsHelped: 0,
//           studentsGraduated: 0,
//           itemsFunded: 0,
//           communityRank: 'New Donor'
//         },
//         recentActivity: []
//       });
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };
//
//   const onRefresh = () => {
//     setRefreshing(true);
//     fetchDashboardStats();
//   };
//
//   const formatCurrency = (amount: number) => {
//     return `$${Number(amount).toFixed(2)}`;
//   };
//
//   const handleBrowseStudents = () => {
//     setShowStudentBrowser(true);
//   };
//
//   const handleStudentSelect = (student: any) => {
//     console.log('Student selected for donation:', student);
//     setSelectedStudent(student);
//     setPreSelectedAmount(undefined);
//     setShowDonationForm(true);
//   };
//
//   const handleQuickDonation = (student: any, amount: number) => {
//     console.log('Quick donation selected:', { student, amount });
//     setSelectedStudent(student);
//     setPreSelectedAmount(amount);
//     setShowDonationForm(true);
//   };
//
//   const handleDonationComplete = (donation: any) => {
//     Alert.alert(
//       'Donation Successful! 🎉',
//       `Thank you for your donation of $${(donation.amount / 100).toFixed(2)} to ${donation.student.firstName} ${donation.student.lastName}!`,
//       [
//         {
//           text: 'OK',
//           onPress: () => {
//             setShowDonationForm(false);
//             setSelectedStudent(null);
//             setShowStudentBrowser(false);
//             // Refresh dashboard to show new donation
//             fetchDashboardStats();
//           }
//         }
//       ]
//     );
//   };
//
//   const handleDonationCancel = () => {
//     setShowDonationForm(false);
//     setSelectedStudent(null);
//     // Stay on student browser
//   };
//
//   const handleBackToDashboard = () => {
//     setShowStudentBrowser(false);
//   };
//
//   const handleViewHistory = () => {
//     Alert.alert('Donation History', 'Donation history will be implemented next!');
//   };
//
//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <View style={styles.loadingContainer}>
//           <Text style={styles.loadingText}>Loading your dashboard...</Text>
//         </View>
//       </View>
//     );
//   }
//
//   if (showDonationForm && selectedStudent) {
//     return (
//       <DonationForm
//         student={selectedStudent}
//         token={userData.token}
//         userData={userData} // FIXED: Pass userData to DonationForm
//         onDonationComplete={handleDonationComplete}
//         onCancel={handleDonationCancel}
//         preSelectedAmount={preSelectedAmount}
//       />
//     );
//   }
//
//   if (showStudentBrowser) {
//     return (
//       <StudentBrowser
//         token={userData.token}
//         onStudentSelect={handleStudentSelect}
//         onBack={handleBackToDashboard}
//         onQuickDonation={handleQuickDonation}
//       />
//     );
//   }
//
//   return (
//     <ScrollView
//       style={styles.container}
//       refreshControl={
//         <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//       }
//     >
//       {/* Header */}
//       <View style={styles.header}>
//         <View>
//           <Text style={styles.welcomeText}>Welcome back, {userData.firstName}!</Text>
//           <Text style={styles.subtitleText}>Your impact dashboard</Text>
//         </View>
//         <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
//           <Text style={styles.logoutButtonText}>Sign Out</Text>
//         </TouchableOpacity>
//       </View>
//
//       {/* Impact Summary */}
//       {stats && (
//         <View style={styles.impactSection}>
//           <Text style={styles.sectionTitle}>Your Impact</Text>
//           <View style={styles.statsGrid}>
//             <View style={styles.statCard}>
//               <Text style={styles.statNumber}>{formatCurrency(stats.overview.totalDonated)}</Text>
//               <Text style={styles.statLabel}>Total Donated</Text>
//             </View>
//             <View style={styles.statCard}>
//               <Text style={styles.statNumber}>{stats.overview.studentsSupported}</Text>
//               <Text style={styles.statLabel}>Students Helped</Text>
//             </View>
//             <View style={styles.statCard}>
//               <Text style={styles.statNumber}>{stats.overview.recurringDonations}</Text>
//               <Text style={styles.statLabel}>Recurring Donations</Text>
//             </View>
//             <View style={styles.statCard}>
//               <Text style={styles.statNumber}>{stats.overview.impactScore}</Text>
//               <Text style={styles.statLabel}>Impact Score</Text>
//             </View>
//           </View>
//         </View>
//       )}
//
//       {/* Monthly Progress */}
//       {stats && (
//         <View style={styles.monthlySection}>
//           <Text style={styles.sectionTitle}>This Month</Text>
//           <View style={styles.monthlyCard}>
//             <View style={styles.monthlyStats}>
//               <Text style={styles.monthlyAmount}>{formatCurrency(stats.monthlyStats.thisMonth)}</Text>
//               <Text style={styles.monthlyLabel}>Donated this month</Text>
//             </View>
//             <View style={styles.monthlyChange}>
//               <Text style={[
//                 styles.changeText,
//                 stats.monthlyStats.percentChange >= 0 ? styles.positiveChange : styles.negativeChange
//               ]}>
//                 {stats.monthlyStats.percentChange >= 0 ? '+' : ''}{stats.monthlyStats.percentChange.toFixed(1)}%
//               </Text>
//               <Text style={styles.changeLabel}>vs last month</Text>
//             </View>
//           </View>
//         </View>
//       )}
//
//       {/* Quick Actions */}
//       <View style={styles.actionsSection}>
//         <Text style={styles.sectionTitle}>Quick Actions</Text>
//         <View style={styles.actionButtons}>
//           <TouchableOpacity
//             style={[styles.actionButton, styles.browseButton]}
//             onPress={handleBrowseStudents}
//           >
//             <Text style={styles.actionButtonText}>Browse Students</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[styles.actionButton, styles.historyButton]}
//             onPress={handleViewHistory}
//           >
//             <Text style={styles.actionButtonText}>Donation History</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//
//       {/* Recent Activity */}
//       {stats && stats.recentActivity.length > 0 && (
//         <View style={styles.activitySection}>
//           <Text style={styles.sectionTitle}>Recent Donations</Text>
//           {stats.recentActivity.map((activity) => (
//             <View key={activity.id} style={styles.activityItem}>
//               <View style={styles.activityInfo}>
//                 <Text style={styles.activityTitle}>{activity.studentName}</Text>
//                 <Text style={styles.activityDate}>
//                   {new Date(activity.date).toLocaleDateString()}
//                 </Text>
//                 {activity.message && (
//                   <Text style={styles.activityMessage}>{activity.message}</Text>
//                 )}
//               </View>
//               <View style={styles.activityAmount}>
//                 <Text style={styles.amountText}>{formatCurrency(activity.amount)}</Text>
//               </View>
//             </View>
//           ))}
//         </View>
//       )}
//
//       {/* Impact Metrics */}
//       {stats && (
//         <View style={styles.impactMetricsSection}>
//           <Text style={styles.sectionTitle}>Impact Breakdown</Text>
//           <View style={styles.metricsGrid}>
//             <View style={styles.metricItem}>
//               <Text style={styles.metricNumber}>{stats.impactMetrics.studentsGraduated}</Text>
//               <Text style={styles.metricLabel}>Students Graduated</Text>
//             </View>
//             <View style={styles.metricItem}>
//               <Text style={styles.metricNumber}>{stats.impactMetrics.itemsFunded}</Text>
//               <Text style={styles.metricLabel}>Items Funded</Text>
//             </View>
//             <View style={styles.metricItem}>
//               <Text style={styles.metricNumber}>{stats.impactMetrics.communityRank}</Text>
//               <Text style={styles.metricLabel}>Community Rank</Text>
//             </View>
//           </View>
//         </View>
//       )}
//
//       {/* Getting Started for New Donors */}
//       {stats && stats.overview.totalDonated === 0 && (
//         <View style={styles.gettingStartedSection}>
//           <Text style={styles.sectionTitle}>Getting Started</Text>
//           <Text style={styles.gettingStartedText}>
//             Welcome to Village Platform! You're all set to start making a difference in students' lives.
//           </Text>
//           <TouchableOpacity
//             style={styles.getStartedButton}
//             onPress={handleBrowseStudents}
//           >
//             <Text style={styles.getStartedButtonText}>Make Your First Donation</Text>
//           </TouchableOpacity>
//         </View>
//       )}
//     </ScrollView>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#121824',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     color: '#fff',
//     fontSize: 18,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 20,
//     paddingTop: 40,
//     backgroundColor: 'rgba(25, 26, 45, 0.9)',
//   },
//   welcomeText: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#fff',
//   },
//   subtitleText: {
//     fontSize: 16,
//     color: '#a3b3ff',
//     marginTop: 4,
//   },
//   logoutButton: {
//     backgroundColor: '#dc2626',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 6,
//   },
//   logoutButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   impactSection: {
//     padding: 20,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginBottom: 16,
//   },
//   statsGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//   },
//   statCard: {
//     backgroundColor: 'rgba(25, 26, 45, 0.8)',
//     padding: 16,
//     borderRadius: 12,
//     width: '48%',
//     marginBottom: 12,
//     alignItems: 'center',
//   },
//   statNumber: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#34A853',
//     marginBottom: 4,
//   },
//   statLabel: {
//     fontSize: 14,
//     color: '#a3b3ff',
//     textAlign: 'center',
//   },
//   monthlySection: {
//     padding: 20,
//     paddingTop: 0,
//   },
//   monthlyCard: {
//     backgroundColor: 'rgba(25, 26, 45, 0.8)',
//     padding: 20,
//     borderRadius: 12,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   monthlyStats: {
//     flex: 1,
//   },
//   monthlyAmount: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: '#fff',
//   },
//   monthlyLabel: {
//     fontSize: 14,
//     color: '#a3b3ff',
//     marginTop: 4,
//   },
//   monthlyChange: {
//     alignItems: 'flex-end',
//   },
//   changeText: {
//     fontSize: 20,
//     fontWeight: 'bold',
//   },
//   positiveChange: {
//     color: '#4BB543',
//   },
//   negativeChange: {
//     color: '#ff6b6b',
//   },
//   changeLabel: {
//     fontSize: 12,
//     color: '#888',
//     marginTop: 2,
//   },
//   actionsSection: {
//     padding: 20,
//     paddingTop: 0,
//   },
//   actionButtons: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   actionButton: {
//     flex: 1,
//     paddingVertical: 16,
//     paddingHorizontal: 12,
//     borderRadius: 8,
//     marginHorizontal: 6,
//     alignItems: 'center',
//   },
//   browseButton: {
//     backgroundColor: '#34A853',
//   },
//   historyButton: {
//     backgroundColor: '#4285F4',
//   },
//   actionButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//     fontSize: 16,
//   },
//   activitySection: {
//     padding: 20,
//     paddingTop: 0,
//   },
//   activityItem: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: 'rgba(25, 26, 45, 0.6)',
//     padding: 16,
//     borderRadius: 8,
//     marginBottom: 8,
//   },
//   activityInfo: {
//     flex: 1,
//   },
//   activityTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#fff',
//   },
//   activityDate: {
//     fontSize: 12,
//     color: '#888',
//     marginTop: 4,
//   },
//   activityMessage: {
//     fontSize: 14,
//     color: '#a3b3ff',
//     marginTop: 4,
//   },
//   activityAmount: {
//     alignItems: 'flex-end',
//   },
//   amountText: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#34A853',
//   },
//   impactMetricsSection: {
//     padding: 20,
//     paddingTop: 0,
//   },
//   metricsGrid: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//   },
//   metricItem: {
//     alignItems: 'center',
//     padding: 16,
//   },
//   metricNumber: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#4285F4',
//   },
//   metricLabel: {
//     fontSize: 12,
//     color: '#a3b3ff',
//     marginTop: 4,
//     textAlign: 'center',
//   },
//   gettingStartedSection: {
//     padding: 20,
//     paddingTop: 0,
//   },
//   gettingStartedText: {
//     fontSize: 16,
//     color: '#ccc',
//     lineHeight: 24,
//     marginBottom: 20,
//   },
//   getStartedButton: {
//     backgroundColor: '#34A853',
//     paddingVertical: 16,
//     paddingHorizontal: 24,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   getStartedButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
// });
//
// export default DonorDashboard;



// // frontend/src/components/donor/DonorDashboard.tsx
// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   RefreshControl,
//   Alert
// } from 'react-native';
// import { API_BASE_URL } from '../../config/api';
// import StudentBrowser from './StudentBrowser';
// import DonationForm from './DonationForm';
//
// interface DonorDashboardProps {
//   userData: any;
//   onLogout: () => void;
// }
//
// interface DashboardStats {
//   overview: {
//     totalDonated: number;
//     studentsSupported: number;
//     recurringDonations: number;
//     impactScore: number;
//   };
//   monthlyStats: {
//     thisMonth: number;
//     lastMonth: number;
//     percentChange: number;
//   };
//   impactMetrics: {
//     studentsHelped: number;
//     studentsGraduated: number;
//     itemsFunded: number;
//     communityRank: string;
//   };
//   recentActivity: Array<{
//     id: string;
//     amount: number;
//     studentName: string;
//     studentPhoto?: string;
//     date: string;
//     message?: string;
//   }>;
// }
//
// const DonorDashboard: React.FC<DonorDashboardProps> = ({ userData, onLogout }) => {
//   const [stats, setStats] = useState<DashboardStats | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [showStudentBrowser, setShowStudentBrowser] = useState(false);
//   const [selectedStudent, setSelectedStudent] = useState<any>(null);
//   const [showDonationForm, setShowDonationForm] = useState(false);
//   const [preSelectedAmount, setPreSelectedAmount] = useState<number | undefined>(undefined);
//
//   useEffect(() => {
//     fetchDashboardStats();
//   }, []);
//
//   const fetchDashboardStats = async () => {
//     try {
//       console.log('Fetching dashboard stats with token:', userData.token);
//
//       const response = await fetch(`${API_BASE_URL}/api/donors/dashboard/stats`, {
//         headers: {
//           'Authorization': `Bearer ${userData.token}`,
//           'Content-Type': 'application/json'
//         }
//       });
//
//       console.log('Dashboard stats response status:', response.status);
//       const data = await response.json();
//       console.log('Dashboard stats data:', data);
//
//       if (data.success) {
//         setStats(data.data);
//       } else {
//         console.error('Failed to fetch dashboard stats:', data.message);
//         // Show simplified dashboard if API fails
//         setStats({
//           overview: {
//             totalDonated: 0,
//             studentsSupported: 0,
//             recurringDonations: 0,
//             impactScore: 0
//           },
//           monthlyStats: {
//             thisMonth: 0,
//             lastMonth: 0,
//             percentChange: 0
//           },
//           impactMetrics: {
//             studentsHelped: 0,
//             studentsGraduated: 0,
//             itemsFunded: 0,
//             communityRank: 'New Donor'
//           },
//           recentActivity: []
//         });
//       }
//     } catch (error) {
//       console.error('Error fetching dashboard stats:', error);
//       // Show simplified dashboard if API fails
//       setStats({
//         overview: {
//           totalDonated: 0,
//           studentsSupported: 0,
//           recurringDonations: 0,
//           impactScore: 0
//         },
//         monthlyStats: {
//           thisMonth: 0,
//           lastMonth: 0,
//           percentChange: 0
//         },
//         impactMetrics: {
//           studentsHelped: 0,
//           studentsGraduated: 0,
//           itemsFunded: 0,
//           communityRank: 'New Donor'
//         },
//         recentActivity: []
//       });
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };
//
//   const onRefresh = () => {
//     setRefreshing(true);
//     fetchDashboardStats();
//   };
//
//   const formatCurrency = (amount: number) => {
//     return `$${(amount / 100).toFixed(2)}`;
//   };
//
//   const handleBrowseStudents = () => {
//     setShowStudentBrowser(true);
//   };
//
//   const handleStudentSelect = (student: any) => {
//     console.log('Student selected for donation:', student);
//     setSelectedStudent(student);
//     setPreSelectedAmount(undefined);
//     setShowDonationForm(true);
//   };
//
//   const handleQuickDonation = (student: any, amount: number) => {
//     console.log('Quick donation selected:', { student, amount });
//     setSelectedStudent(student);
//     setPreSelectedAmount(amount);
//     setShowDonationForm(true);
//   };
//
//   const handleDonationComplete = (donation: any) => {
//     Alert.alert(
//       'Donation Successful! 🎉',
//       `Thank you for your donation of $${(donation.amount / 100).toFixed(2)} to ${donation.student.firstName} ${donation.student.lastName}!`,
//       [
//         {
//           text: 'OK',
//           onPress: () => {
//             setShowDonationForm(false);
//             setSelectedStudent(null);
//             setShowStudentBrowser(false);
//             // Refresh dashboard to show new donation
//             fetchDashboardStats();
//           }
//         }
//       ]
//     );
//   };
//
//   const handleDonationCancel = () => {
//     setShowDonationForm(false);
//     setSelectedStudent(null);
//     // Stay on student browser
//   };
//
//   const handleBackToDashboard = () => {
//     setShowStudentBrowser(false);
//   };
//
//   const handleViewHistory = () => {
//     Alert.alert('Donation History', 'Donation history will be implemented next!');
//   };
//
//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <View style={styles.loadingContainer}>
//           <Text style={styles.loadingText}>Loading your dashboard...</Text>
//         </View>
//       </View>
//     );
//   }
//
//   if (showDonationForm && selectedStudent) {
//     return (
//       <DonationForm
//         student={selectedStudent}
//         token={userData.token}
//         onDonationComplete={handleDonationComplete}
//         onCancel={handleDonationCancel}
//         preSelectedAmount={preSelectedAmount}
//       />
//     );
//   }
//
//   if (showStudentBrowser) {
//     return (
//       <StudentBrowser
//         token={userData.token}
//         onStudentSelect={handleStudentSelect}
//         onBack={handleBackToDashboard}
//         onQuickDonation={handleQuickDonation}
//       />
//     );
//   }
//
//   return (
//     <ScrollView
//       style={styles.container}
//       refreshControl={
//         <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//       }
//     >
//       {/* Header */}
//       <View style={styles.header}>
//         <View>
//           <Text style={styles.welcomeText}>Welcome back, {userData.firstName}!</Text>
//           <Text style={styles.subtitleText}>Your impact dashboard</Text>
//         </View>
//         <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
//           <Text style={styles.logoutButtonText}>Sign Out</Text>
//         </TouchableOpacity>
//       </View>
//
//       {/* Impact Summary */}
//       {stats && (
//         <View style={styles.impactSection}>
//           <Text style={styles.sectionTitle}>Your Impact</Text>
//           <View style={styles.statsGrid}>
//             <View style={styles.statCard}>
//               <Text style={styles.statNumber}>{formatCurrency(stats.overview.totalDonated)}</Text>
//               <Text style={styles.statLabel}>Total Donated</Text>
//             </View>
//             <View style={styles.statCard}>
//               <Text style={styles.statNumber}>{stats.overview.studentsSupported}</Text>
//               <Text style={styles.statLabel}>Students Helped</Text>
//             </View>
//             <View style={styles.statCard}>
//               <Text style={styles.statNumber}>{stats.overview.recurringDonations}</Text>
//               <Text style={styles.statLabel}>Recurring Donations</Text>
//             </View>
//             <View style={styles.statCard}>
//               <Text style={styles.statNumber}>{stats.overview.impactScore}</Text>
//               <Text style={styles.statLabel}>Impact Score</Text>
//             </View>
//           </View>
//         </View>
//       )}
//
//       {/* Monthly Progress */}
//       {stats && (
//         <View style={styles.monthlySection}>
//           <Text style={styles.sectionTitle}>This Month</Text>
//           <View style={styles.monthlyCard}>
//             <View style={styles.monthlyStats}>
//               <Text style={styles.monthlyAmount}>{formatCurrency(stats.monthlyStats.thisMonth)}</Text>
//               <Text style={styles.monthlyLabel}>Donated this month</Text>
//             </View>
//             <View style={styles.monthlyChange}>
//               <Text style={[
//                 styles.changeText,
//                 stats.monthlyStats.percentChange >= 0 ? styles.positiveChange : styles.negativeChange
//               ]}>
//                 {stats.monthlyStats.percentChange >= 0 ? '+' : ''}{stats.monthlyStats.percentChange.toFixed(1)}%
//               </Text>
//               <Text style={styles.changeLabel}>vs last month</Text>
//             </View>
//           </View>
//         </View>
//       )}
//
//       {/* Quick Actions */}
//       <View style={styles.actionsSection}>
//         <Text style={styles.sectionTitle}>Quick Actions</Text>
//         <View style={styles.actionButtons}>
//           <TouchableOpacity
//             style={[styles.actionButton, styles.browseButton]}
//             onPress={handleBrowseStudents}
//           >
//             <Text style={styles.actionButtonText}>Browse Students</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[styles.actionButton, styles.historyButton]}
//             onPress={handleViewHistory}
//           >
//             <Text style={styles.actionButtonText}>Donation History</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//
//       {/* Recent Activity */}
//       {stats && stats.recentActivity.length > 0 && (
//         <View style={styles.activitySection}>
//           <Text style={styles.sectionTitle}>Recent Donations</Text>
//           {stats.recentActivity.map((activity) => (
//             <View key={activity.id} style={styles.activityItem}>
//               <View style={styles.activityInfo}>
//                 <Text style={styles.activityTitle}>{activity.studentName}</Text>
//                 <Text style={styles.activityDate}>
//                   {new Date(activity.date).toLocaleDateString()}
//                 </Text>
//                 {activity.message && (
//                   <Text style={styles.activityMessage}>{activity.message}</Text>
//                 )}
//               </View>
//               <View style={styles.activityAmount}>
//                 <Text style={styles.amountText}>{formatCurrency(activity.amount)}</Text>
//               </View>
//             </View>
//           ))}
//         </View>
//       )}
//
//       {/* Impact Metrics */}
//       {stats && (
//         <View style={styles.impactMetricsSection}>
//           <Text style={styles.sectionTitle}>Impact Breakdown</Text>
//           <View style={styles.metricsGrid}>
//             <View style={styles.metricItem}>
//               <Text style={styles.metricNumber}>{stats.impactMetrics.studentsGraduated}</Text>
//               <Text style={styles.metricLabel}>Students Graduated</Text>
//             </View>
//             <View style={styles.metricItem}>
//               <Text style={styles.metricNumber}>{stats.impactMetrics.itemsFunded}</Text>
//               <Text style={styles.metricLabel}>Items Funded</Text>
//             </View>
//             <View style={styles.metricItem}>
//               <Text style={styles.metricNumber}>{stats.impactMetrics.communityRank}</Text>
//               <Text style={styles.metricLabel}>Community Rank</Text>
//             </View>
//           </View>
//         </View>
//       )}
//
//       {/* Getting Started for New Donors */}
//       {stats && stats.overview.totalDonated === 0 && (
//         <View style={styles.gettingStartedSection}>
//           <Text style={styles.sectionTitle}>Getting Started</Text>
//           <Text style={styles.gettingStartedText}>
//             Welcome to Village Platform! You're all set to start making a difference in students' lives.
//           </Text>
//           <TouchableOpacity
//             style={styles.getStartedButton}
//             onPress={handleBrowseStudents}
//           >
//             <Text style={styles.getStartedButtonText}>Make Your First Donation</Text>
//           </TouchableOpacity>
//         </View>
//       )}
//     </ScrollView>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#121824',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     color: '#fff',
//     fontSize: 18,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 20,
//     paddingTop: 40,
//     backgroundColor: 'rgba(25, 26, 45, 0.9)',
//   },
//   welcomeText: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#fff',
//   },
//   subtitleText: {
//     fontSize: 16,
//     color: '#a3b3ff',
//     marginTop: 4,
//   },
//   logoutButton: {
//     backgroundColor: '#dc2626',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 6,
//   },
//   logoutButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   impactSection: {
//     padding: 20,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginBottom: 16,
//   },
//   statsGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//   },
//   statCard: {
//     backgroundColor: 'rgba(25, 26, 45, 0.8)',
//     padding: 16,
//     borderRadius: 12,
//     width: '48%',
//     marginBottom: 12,
//     alignItems: 'center',
//   },
//   statNumber: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#34A853',
//     marginBottom: 4,
//   },
//   statLabel: {
//     fontSize: 14,
//     color: '#a3b3ff',
//     textAlign: 'center',
//   },
//   monthlySection: {
//     padding: 20,
//     paddingTop: 0,
//   },
//   monthlyCard: {
//     backgroundColor: 'rgba(25, 26, 45, 0.8)',
//     padding: 20,
//     borderRadius: 12,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   monthlyStats: {
//     flex: 1,
//   },
//   monthlyAmount: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: '#fff',
//   },
//   monthlyLabel: {
//     fontSize: 14,
//     color: '#a3b3ff',
//     marginTop: 4,
//   },
//   monthlyChange: {
//     alignItems: 'flex-end',
//   },
//   changeText: {
//     fontSize: 20,
//     fontWeight: 'bold',
//   },
//   positiveChange: {
//     color: '#4BB543',
//   },
//   negativeChange: {
//     color: '#ff6b6b',
//   },
//   changeLabel: {
//     fontSize: 12,
//     color: '#888',
//     marginTop: 2,
//   },
//   actionsSection: {
//     padding: 20,
//     paddingTop: 0,
//   },
//   actionButtons: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   actionButton: {
//     flex: 1,
//     paddingVertical: 16,
//     paddingHorizontal: 12,
//     borderRadius: 8,
//     marginHorizontal: 6,
//     alignItems: 'center',
//   },
//   browseButton: {
//     backgroundColor: '#34A853',
//   },
//   historyButton: {
//     backgroundColor: '#4285F4',
//   },
//   actionButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//     fontSize: 16,
//   },
//   activitySection: {
//     padding: 20,
//     paddingTop: 0,
//   },
//   activityItem: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: 'rgba(25, 26, 45, 0.6)',
//     padding: 16,
//     borderRadius: 8,
//     marginBottom: 8,
//   },
//   activityInfo: {
//     flex: 1,
//   },
//   activityTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#fff',
//   },
//   activityDate: {
//     fontSize: 12,
//     color: '#888',
//     marginTop: 4,
//   },
//   activityMessage: {
//     fontSize: 14,
//     color: '#a3b3ff',
//     marginTop: 4,
//   },
//   activityAmount: {
//     alignItems: 'flex-end',
//   },
//   amountText: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#34A853',
//   },
//   impactMetricsSection: {
//     padding: 20,
//     paddingTop: 0,
//   },
//   metricsGrid: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//   },
//   metricItem: {
//     alignItems: 'center',
//     padding: 16,
//   },
//   metricNumber: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#4285F4',
//   },
//   metricLabel: {
//     fontSize: 12,
//     color: '#a3b3ff',
//     marginTop: 4,
//     textAlign: 'center',
//   },
//   gettingStartedSection: {
//     padding: 20,
//     paddingTop: 0,
//   },
//   gettingStartedText: {
//     fontSize: 16,
//     color: '#ccc',
//     lineHeight: 24,
//     marginBottom: 20,
//   },
//   getStartedButton: {
//     backgroundColor: '#34A853',
//     paddingVertical: 16,
//     paddingHorizontal: 24,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   getStartedButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
// });
//
// export default DonorDashboard;