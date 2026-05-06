/* =============================================
   NEW FOUNDATION SCHOOL - ANALYTICS DASHBOARD
   Professional JavaScript Engine
   ============================================= */

// ============ GLOBAL STATE ============
let allData = [];
let filteredData = [];
let charts = {};
let currentSection = 'overview';
let sortCol = null;
let sortDir = 'asc';
let currentPage = 1;
const rowsPerPage = 15;

// ============ CSV PARSER ============
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => {
            const key = h.trim();
            const val = (values[i] || '').trim();
            if (['Total_Fees', 'Amount_Paid', 'Balance', 'Late_Days', 'Scholarship_Amount', 'Age'].includes(key)) {
                obj[key] = val === '' ? 0 : parseFloat(val);
            } else {
                obj[key] = val;
            }
        });
        return obj;
    });
}

// ============ DATA LOADING ============
async function loadData() {
    try {
        const response = await fetch('school_fees_dataset.csv');
        const csv = await response.text();
        allData = parseCSV(csv);
        filteredData = [...allData];
        initDashboard();
    } catch (err) {
        console.error('Error loading data:', err);
    }
}

// ============ FORMATTING HELPERS ============
function formatCurrency(value) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-NG').format(value);
}

function animateValue(el, start, end, duration, isCurrency) {
    const startTime = performance.now();
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (end - start) * eased);
        el.textContent = isCurrency ? formatCurrency(current) : formatNumber(current);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ============ CHART COLORS ============
const COLORS = {
    primary: '#4f46e5',
    primaryLight: '#818cf8',
    secondary: '#0ea5e9',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    purple: '#8b5cf6',
    pink: '#ec4899',
    teal: '#14b8a6',
    orange: '#f97316',
    indigo: '#6366f1',
    lime: '#84cc16',
    cyan: '#06b6d4',
    rose: '#f43f5e',
    emerald: '#059669',
    amber: '#d97706',
    sky: '#0284c7',
    accent: '#f59e0b'
};

const CHART_PALETTE = [
    COLORS.primary, COLORS.success, COLORS.danger, COLORS.warning,
    COLORS.info, COLORS.purple, COLORS.pink, COLORS.teal,
    COLORS.orange, COLORS.cyan
];

const CLASS_ORDER = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

// ============ CHART DEFAULTS ============
function getChartDefaults() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        color: isDark ? '#e2e8f0' : '#334155',
        gridColor: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.15)',
        fontFamily: "'Inter', sans-serif"
    };
}

// ============ INITIALIZE DASHBOARD ============
function initDashboard() {
    updateKPIs();
    createAllCharts();
    renderTable();
    setupEventListeners();
    hidePreloader();
}

function hidePreloader() {
    setTimeout(() => {
        document.getElementById('preloader').classList.add('hidden');
    }, 2000);
}

// ============ KPI UPDATES ============
function updateKPIs() {
    const data = filteredData;
    const totalFees = data.reduce((s, d) => s + d.Total_Fees, 0);
    const totalPaid = data.reduce((s, d) => s + d.Amount_Paid, 0);
    const totalBalance = data.reduce((s, d) => s + d.Balance, 0);
    const totalScholarship = data.reduce((s, d) => s + d.Scholarship_Amount, 0);
    const paidCount = data.filter(d => d.Payment_Status === 'Full').length;
    const unpaidCount = data.filter(d => d.Payment_Status === 'Unpaid').length;
    const scholarshipCount = data.filter(d => d.Scholarship_Amount > 0).length;
    const collectionRate = totalFees > 0 ? ((totalPaid / totalFees) * 100).toFixed(1) : 0;

    animateValue(document.getElementById('kpiTotalFees'), 0, totalFees, 1200, true);
    animateValue(document.getElementById('kpiCollected'), 0, totalPaid, 1200, true);
    animateValue(document.getElementById('kpiBalance'), 0, totalBalance, 1200, true);
    animateValue(document.getElementById('kpiStudents'), 0, data.length, 800, false);
    animateValue(document.getElementById('kpiScholarship'), 0, totalScholarship, 1200, true);

    document.getElementById('kpiPaid').textContent = paidCount;
    document.getElementById('kpiUnpaid').textContent = unpaidCount;
    document.getElementById('kpiScholarshipCount').textContent = scholarshipCount;
    document.getElementById('kpiCollectionRate').textContent = collectionRate + '%';
    document.getElementById('kpiBalancePct').textContent = (totalFees > 0 ? ((totalBalance / totalFees) * 100).toFixed(1) : 0) + '%';

    const collectedPct = totalFees > 0 ? ((totalPaid / totalFees) * 100).toFixed(1) : 0;
    const trendEl = document.getElementById('kpiCollectedTrend');
    trendEl.className = 'kpi-trend ' + (collectedPct >= 50 ? 'up' : 'down');
    trendEl.innerHTML = `<i class="fas fa-arrow-trend-${collectedPct >= 50 ? 'up' : 'down'}"></i> <span>${collectedPct}%</span>`;

    setTimeout(() => {
        document.getElementById('kpiProgressBar').style.width = collectionRate + '%';
    }, 300);

    updateFinancialKPIs();
    updateStudentKPIs();
    updatePaymentKPIs();
    updateScholarshipKPIs();
    updateRecordsKPIs();
}

// ============ FINANCIAL SECTION KPIs ============
function updateFinancialKPIs() {
    const data = filteredData;
    const totalFees = data.reduce((s, d) => s + d.Total_Fees, 0);
    const totalPaid = data.reduce((s, d) => s + d.Amount_Paid, 0);
    const totalBalance = data.reduce((s, d) => s + d.Balance, 0);
    const collectionRate = totalFees > 0 ? ((totalPaid / totalFees) * 100).toFixed(1) : 0;

    animateValue(document.getElementById('finKpiTotalFees'), 0, totalFees, 1200, true);
    animateValue(document.getElementById('finKpiCollected'), 0, totalPaid, 1200, true);
    animateValue(document.getElementById('finKpiOutstanding'), 0, totalBalance, 1200, true);
    document.getElementById('finKpiRate').textContent = collectionRate + '%';
    document.getElementById('finKpiOutstandingPct').textContent = (totalFees > 0 ? ((totalBalance / totalFees) * 100).toFixed(1) : 0) + '%';

    const collectedPct = totalFees > 0 ? ((totalPaid / totalFees) * 100).toFixed(1) : 0;
    const trendEl = document.getElementById('finKpiCollectedTrend');
    trendEl.className = 'kpi-trend ' + (collectedPct >= 50 ? 'up' : 'down');
    trendEl.innerHTML = `<i class="fas fa-arrow-trend-${collectedPct >= 50 ? 'up' : 'down'}"></i> <span>${collectedPct}%</span>`;

    setTimeout(() => {
        document.getElementById('finKpiProgressBar').style.width = collectionRate + '%';
    }, 300);

    const paidStudents = data.filter(d => d.Payment_Date && d.Payment_Date !== '');
    const months = new Set();
    paidStudents.forEach(d => {
        const date = new Date(d.Payment_Date);
        months.add(date.getMonth() + '-' + date.getFullYear());
    });
    const avgMonthly = months.size > 0 ? Math.round(totalPaid / months.size) : 0;
    animateValue(document.getElementById('finKpiAvgMonthly'), 0, avgMonthly, 1000, true);

    const classBalances = {};
    CLASS_ORDER.forEach(c => classBalances[c] = 0);
    data.forEach(d => { if (classBalances.hasOwnProperty(d.Class)) classBalances[d.Class] += d.Balance; });
    let highestClass = '-';
    let highestBal = 0;
    Object.entries(classBalances).forEach(([cls, bal]) => {
        if (bal > highestBal) { highestBal = bal; highestClass = cls; }
    });
    animateValue(document.getElementById('finKpiHighestBalance'), 0, highestBal, 1000, true);
    document.getElementById('finKpiHighestBalanceClass').textContent = highestClass;
}

// ============ STUDENT DEMOGRAPHICS KPIs ============
function updateStudentKPIs() {
    const data = filteredData;
    const males = data.filter(d => d.Gender === 'Male').length;
    const females = data.filter(d => d.Gender === 'Female').length;
    const total = data.length;

    animateValue(document.getElementById('stuKpiTotal'), 0, total, 800, false);
    animateValue(document.getElementById('stuKpiMale'), 0, males, 800, false);
    animateValue(document.getElementById('stuKpiFemale'), 0, females, 800, false);
    document.getElementById('stuKpiMalePct').textContent = total > 0 ? ((males / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('stuKpiFemalePct').textContent = total > 0 ? ((females / total) * 100).toFixed(1) + '%' : '0%';

    const avgAge = total > 0 ? (data.reduce((s, d) => s + d.Age, 0) / total).toFixed(1) : 0;
    const minAge = total > 0 ? Math.min(...data.map(d => d.Age)) : 0;
    const maxAge = total > 0 ? Math.max(...data.map(d => d.Age)) : 0;
    document.getElementById('stuKpiAvgAge').textContent = avgAge;
    document.getElementById('stuKpiAgeRange').textContent = `Range: ${minAge} - ${maxAge} years`;

    const classCounts = {};
    data.forEach(d => { classCounts[d.Class] = (classCounts[d.Class] || 0) + 1; });
    let topClass = '-';
    let topCount = 0;
    Object.entries(classCounts).forEach(([cls, cnt]) => {
        if (cnt > topCount) { topCount = cnt; topClass = cls; }
    });
    document.getElementById('stuKpiTopClass').textContent = topClass;
    document.getElementById('stuKpiTopClassCount').textContent = topCount + ' students';

    const uniqueClasses = new Set(data.map(d => d.Class)).size;
    document.getElementById('stuKpiClassCount').textContent = uniqueClasses;
}

// ============ PAYMENT INSIGHTS KPIs ============
function updatePaymentKPIs() {
    const data = filteredData;
    const total = data.length;
    const fullyPaid = data.filter(d => d.Payment_Status === 'Full').length;
    const partial = data.filter(d => d.Payment_Status === 'Partial').length;
    const unpaid = data.filter(d => d.Payment_Status === 'Unpaid').length;

    animateValue(document.getElementById('payKpiFullyPaid'), 0, fullyPaid, 800, false);
    animateValue(document.getElementById('payKpiPartial'), 0, partial, 800, false);
    animateValue(document.getElementById('payKpiUnpaid'), 0, unpaid, 800, false);
    document.getElementById('payKpiFullyPaidPct').textContent = total > 0 ? ((fullyPaid / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('payKpiPartialPct').textContent = total > 0 ? ((partial / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('payKpiUnpaidPct').textContent = total > 0 ? ((unpaid / total) * 100).toFixed(1) + '%' : '0%';

    const lateDays = data.filter(d => d.Late_Days > 0);
    const avgLate = lateDays.length > 0 ? (lateDays.reduce((s, d) => s + d.Late_Days, 0) / lateDays.length).toFixed(0) : 0;
    const maxLate = lateDays.length > 0 ? Math.max(...lateDays.map(d => d.Late_Days)) : 0;
    document.getElementById('payKpiAvgLate').textContent = avgLate;
    document.getElementById('payKpiMaxLate').textContent = `Max: ${maxLate} days`;

    const methodCounts = {};
    data.filter(d => d.Payment_Method && d.Payment_Method !== '').forEach(d => {
        methodCounts[d.Payment_Method] = (methodCounts[d.Payment_Method] || 0) + 1;
    });
    let topMethod = '-';
    let topMethodCount = 0;
    Object.entries(methodCounts).forEach(([method, cnt]) => {
        if (cnt > topMethodCount) { topMethodCount = cnt; topMethod = method; }
    });
    document.getElementById('payKpiTopMethod').textContent = topMethod;
    document.getElementById('payKpiTopMethodCount').textContent = topMethodCount + ' transactions';

    const withBalance = data.filter(d => d.Balance > 0).sort((a, b) => b.Balance - a.Balance);
    if (withBalance.length > 0) {
        animateValue(document.getElementById('payKpiHighestDebt'), 0, withBalance[0].Balance, 1000, true);
        document.getElementById('payKpiHighestDebtName').textContent = withBalance[0].Student_Name;
    } else {
        document.getElementById('payKpiHighestDebt').textContent = formatCurrency(0);
        document.getElementById('payKpiHighestDebtName').textContent = '-';
    }
}

// ============ SCHOLARSHIP KPIs ============
function updateScholarshipKPIs() {
    const data = filteredData;
    const total = data.length;
    const totalScholarship = data.reduce((s, d) => s + d.Scholarship_Amount, 0);
    const recipients = data.filter(d => d.Scholarship_Amount > 0);
    const fullScholarship = data.filter(d => d.Scholarship_Amount === 10000).length;
    const partialScholarship = data.filter(d => d.Scholarship_Amount === 5000).length;
    const noScholarship = data.filter(d => d.Scholarship_Amount === 0).length;
    const avgScholarship = recipients.length > 0 ? Math.round(totalScholarship / recipients.length) : 0;

    animateValue(document.getElementById('schKpiTotal'), 0, totalScholarship, 1200, true);
    animateValue(document.getElementById('schKpiRecipients'), 0, recipients.length, 800, false);
    animateValue(document.getElementById('schKpiAvg'), 0, avgScholarship, 1000, true);
    animateValue(document.getElementById('schKpiFull'), 0, fullScholarship, 800, false);
    animateValue(document.getElementById('schKpiPartial'), 0, partialScholarship, 800, false);
    animateValue(document.getElementById('schKpiNone'), 0, noScholarship, 800, false);

    document.getElementById('schKpiRecipientsPct').textContent = total > 0 ? ((recipients.length / total) * 100).toFixed(1) + '% of students' : '0% of students';
    document.getElementById('schKpiFullPct').textContent = total > 0 ? ((fullScholarship / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('schKpiPartialPct').textContent = total > 0 ? ((partialScholarship / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('schKpiNonePct').textContent = total > 0 ? ((noScholarship / total) * 100).toFixed(1) + '%' : '0%';
}

// ============ RECORDS SUMMARY KPIs ============
function updateRecordsKPIs() {
    const data = filteredData;
    const total = data.length;
    const paid = data.filter(d => d.Payment_Status === 'Full').length;
    const partial = data.filter(d => d.Payment_Status === 'Partial').length;
    const unpaid = data.filter(d => d.Payment_Status === 'Unpaid').length;

    animateValue(document.getElementById('recKpiTotal'), 0, total, 800, false);
    animateValue(document.getElementById('recKpiPaid'), 0, paid, 800, false);
    animateValue(document.getElementById('recKpiPartial'), 0, partial, 800, false);
    animateValue(document.getElementById('recKpiUnpaid'), 0, unpaid, 800, false);

    document.getElementById('recKpiPaidPct').textContent = total > 0 ? ((paid / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('recKpiPartialPct').textContent = total > 0 ? ((partial / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('recKpiUnpaidPct').textContent = total > 0 ? ((unpaid / total) * 100).toFixed(1) + '%' : '0%';
}

// ============ CHART CREATION ============
function createAllCharts() {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.animation = { duration: 1200, easing: 'easeOutQuart' };

    createPaymentStatusChart();
    createRevenueByClassChart();
    createGenderChart();
    createPaymentMethodChart();
    createIncomeLevelChart();
    createMonthlyTrendChart();
    createFeesVsCollectionChart();
    createBalanceByClassChart();
    createCollectionRateByClassChart();
    createStudentsPerClassChart();
    createAgeDistributionChart();
    createGenderByClassChart();
    createIncomeLevelByClassChart();
    createLateDaysChart();
    createPaymentMethodByStatusChart();
    createTopBalancesChart();
    createStatusByIncomeChart();
    createScholarshipByClassChart();
    createScholarshipByIncomeChart();
    createScholarshipTiersChart();
    createScholarshipVsPaymentChart();
}

function destroyAllCharts() {
    Object.values(charts).forEach(c => c && c.destroy());
    charts = {};
}

function refreshCharts() {
    destroyAllCharts();
    createAllCharts();
}

// ============ OVERVIEW CHARTS ============
function createPaymentStatusChart() {
    const data = filteredData;
    const counts = { Full: 0, Partial: 0, Unpaid: 0 };
    data.forEach(d => { if (counts.hasOwnProperty(d.Payment_Status)) counts[d.Payment_Status]++; });
    const defaults = getChartDefaults();

    charts.paymentStatus = new Chart(document.getElementById('chartPaymentStatus'), {
        type: 'doughnut',
        data: {
            labels: ['Fully Paid', 'Partial', 'Unpaid'],
            datasets: [{
                data: [counts.Full, counts.Partial, counts.Unpaid],
                backgroundColor: [COLORS.success, COLORS.warning, COLORS.danger],
                borderWidth: 3,
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#fff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { color: defaults.color, font: { size: 12 } } },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.95)',
                    titleFont: { weight: '700' },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.raw} students (${((ctx.raw / data.length) * 100).toFixed(1)}%)`
                    }
                }
            }
        }
    });
}

function createRevenueByClassChart() {
    const data = filteredData;
    const classData = {};
    CLASS_ORDER.forEach(c => classData[c] = { fees: 0, paid: 0 });
    data.forEach(d => {
        if (classData[d.Class]) {
            classData[d.Class].fees += d.Total_Fees;
            classData[d.Class].paid += d.Amount_Paid;
        }
    });
    const defaults = getChartDefaults();

    charts.revenueByClass = new Chart(document.getElementById('chartRevenueByClass'), {
        type: 'bar',
        data: {
            labels: CLASS_ORDER,
            datasets: [
                {
                    label: 'Total Fees',
                    data: CLASS_ORDER.map(c => classData[c].fees),
                    backgroundColor: COLORS.primary + '99',
                    borderColor: COLORS.primary,
                    borderWidth: 2,
                    borderRadius: 6,
                    barPercentage: 0.7
                },
                {
                    label: 'Amount Paid',
                    data: CLASS_ORDER.map(c => classData[c].paid),
                    backgroundColor: COLORS.success + '99',
                    borderColor: COLORS.success,
                    borderWidth: 2,
                    borderRadius: 6,
                    barPercentage: 0.7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: defaults.color, font: { size: 11 } } },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.95)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: defaults.color, font: { size: 11, weight: '600' } } },
                y: {
                    grid: { color: defaults.gridColor },
                    ticks: { color: defaults.color, font: { size: 10 }, callback: v => formatCurrency(v) }
                }
            }
        }
    });
}

function createGenderChart() {
    const data = filteredData;
    const male = data.filter(d => d.Gender === 'Male').length;
    const female = data.filter(d => d.Gender === 'Female').length;
    const defaults = getChartDefaults();

    charts.gender = new Chart(document.getElementById('chartGender'), {
        type: 'doughnut',
        data: {
            labels: ['Male', 'Female'],
            datasets: [{
                data: [male, female],
                backgroundColor: [COLORS.info, COLORS.pink],
                borderWidth: 3,
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#fff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom', labels: { color: defaults.color, font: { size: 11 } } },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.95)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.raw} (${((ctx.raw / data.length) * 100).toFixed(1)}%)`
                    }
                }
            }
        }
    });
}

function createPaymentMethodChart() {
    const data = filteredData.filter(d => d.Payment_Method && d.Payment_Method !== '');
    const methods = {};
    data.forEach(d => { methods[d.Payment_Method] = (methods[d.Payment_Method] || 0) + 1; });
    const labels = Object.keys(methods);
    const defaults = getChartDefaults();

    charts.paymentMethod = new Chart(document.getElementById('chartPaymentMethod'), {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: labels.map(l => methods[l]),
                backgroundColor: [COLORS.primary, COLORS.success, COLORS.warning, COLORS.info, COLORS.purple],
                borderWidth: 3,
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#fff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom', labels: { color: defaults.color, font: { size: 10 } } },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.95)',
                    padding: 12,
                    cornerRadius: 8
                }
            }
        }
    });
}

function createIncomeLevelChart() {
    const data = filteredData;
    const levels = { High: 0, Medium: 0, Low: 0 };
    data.forEach(d => { if (levels.hasOwnProperty(d.Parent_Income_Level)) levels[d.Parent_Income_Level]++; });
    const defaults = getChartDefaults();

    charts.incomeLevel = new Chart(document.getElementById('chartIncomeLevel'), {
        type: 'doughnut',
        data: {
            labels: ['High Income', 'Medium Income', 'Low Income'],
            datasets: [{
                data: [levels.High, levels.Medium, levels.Low],
                backgroundColor: [COLORS.success, COLORS.info, COLORS.warning],
                borderWidth: 3,
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#fff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom', labels: { color: defaults.color, font: { size: 10 } } },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.95)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.raw} (${((ctx.raw / data.length) * 100).toFixed(1)}%)`
                    }
                }
            }
        }
    });
}

// ============ FINANCIAL CHARTS ============
function createMonthlyTrendChart() {
    const data = filteredData.filter(d => d.Payment_Date && d.Payment_Date !== '');
    const monthly = {};
    data.forEach(d => {
        const date = new Date(d.Payment_Date);
        const key = date.toLocaleString('en', { month: 'short', year: 'numeric' });
        monthly[key] = (monthly[key] || 0) + d.Amount_Paid;
    });

    const monthOrder = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026'];
    const labels = monthOrder.filter(m => monthly[m]);
    const values = labels.map(l => monthly[l] || 0);
    const defaults = getChartDefaults();

    charts.monthlyTrend = new Chart(document.getElementById('chartMonthlyTrend'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Amount Collected',
                data: values,
                borderColor: COLORS.primary,
                backgroundColor: COLORS.primary + '20',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 9,
                pointBackgroundColor: COLORS.primary,
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.95)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: { label: ctx => ` Collected: ${formatCurrency(ctx.raw)}` }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: defaults.color, font: { size: 12, weight: '600' } } },
                y: {
                    grid: { color: defaults.gridColor },
                    ticks: { color: defaults.color, callback: v => formatCurrency(v) },
                    beginAtZero: true
                }
            }
        }
    });
}

function createFeesVsCollectionChart() {
    const classData = {};
    CLASS_ORDER.forEach(c => classData[c] = { fees: 0, paid: 0, balance: 0 });
    filteredData.forEach(d => {
        if (classData[d.Class]) {
            classData[d.Class].fees += d.Total_Fees;
            classData[d.Class].paid += d.Amount_Paid;
            classData[d.Class].balance += d.Balance;
        }
    });
    const defaults = getChartDefaults();

    charts.feesVsCollection = new Chart(document.getElementById('chartFeesVsCollection'), {
        type: 'bar',
        data: {
            labels: CLASS_ORDER,
            datasets: [
                {
                    label: 'Total Fees',
                    data: CLASS_ORDER.map(c => classData[c].fees),
                    backgroundColor: COLORS.primary + '80',
                    borderColor: COLORS.primary,
                    borderWidth: 2,
                    borderRadius: 4
                },
                {
                    label: 'Collected',
                    data: CLASS_ORDER.map(c => classData[c].paid),
                    backgroundColor: COLORS.success + '80',
                    borderColor: COLORS.success,
                    borderWidth: 2,
                    borderRadius: 4
                },
                {
                    label: 'Outstanding',
                    data: CLASS_ORDER.map(c => classData[c].balance),
                    backgroundColor: COLORS.danger + '80',
                    borderColor: COLORS.danger,
                    borderWidth: 2,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: defaults.color, font: { size: 11 } } },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.95)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: defaults.color, font: { weight: '600' } } },
                y: { grid: { color: defaults.gridColor }, ticks: { color: defaults.color, callback: v => formatCurrency(v) } }
            }
        }
    });
}

function createBalanceByClassChart() {
    const classData = {};
    CLASS_ORDER.forEach(c => classData[c] = 0);
    filteredData.forEach(d => { if (classData.hasOwnProperty(d.Class)) classData[d.Class] += d.Balance; });
    const defaults = getChartDefaults();

    charts.balanceByClass = new Chart(document.getElementById('chartBalanceByClass'), {
        type: 'bar',
        data: {
            labels: CLASS_ORDER,
            datasets: [{
                label: 'Outstanding Balance',
                data: CLASS_ORDER.map(c => classData[c]),
                backgroundColor: CLASS_ORDER.map((_, i) => CHART_PALETTE[i]),
                borderColor: CLASS_ORDER.map((_, i) => CHART_PALETTE[i]),
                borderWidth: 2,
                borderRadius: 6,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.95)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: { label: ctx => ` Balance: ${formatCurrency(ctx.raw)}` }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: defaults.color, font: { weight: '600' } } },
                y: { grid: { color: defaults.gridColor }, ticks: { color: defaults.color, callback: v => formatCurrency(v) } }
            }
        }
    });
}

function createCollectionRateByClassChart() {
    const classData = {};
    CLASS_ORDER.forEach(c => classData[c] = { fees: 0, paid: 0 });
    filteredData.forEach(d => {
        if (classData[d.Class]) {
            classData[d.Class].fees += d.Total_Fees;
            classData[d.Class].paid += d.Amount_Paid;
        }
    });
    const rates = CLASS_ORDER.map(c => classData[c].fees > 0 ? ((classData[c].paid / classData[c].fees) * 100).toFixed(1) : 0);
    const defaults = getChartDefaults();

    charts.collectionRateByClass = new Chart(document.getElementById('chartCollectionRateByClass'), {
        type: 'bar',
        data: {
            labels: CLASS_ORDER,
            datasets: [{
                label: 'Collection Rate (%)',
                data: rates,
                backgroundColor: rates.map(r => r >= 50 ? COLORS.success + '99' : COLORS.danger + '99'),
                borderColor: rates.map(r => r >= 50 ? COLORS.success : COLORS.danger),
                borderWidth: 2,
                borderRadius: 6,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.95)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: { label: ctx => ` Rate: ${ctx.raw}%` }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: defaults.color, font: { weight: '600' } } },
                y: {
                    grid: { color: defaults.gridColor },
                    ticks: { color: defaults.color, callback: v => v + '%' },
                    max: 100
                }
            }
        }
    });
}

// ============ STUDENTS CHARTS ============
function createStudentsPerClassChart() {
    const classData = {};
    CLASS_ORDER.forEach(c => classData[c] = 0);
    filteredData.forEach(d => { if (classData.hasOwnProperty(d.Class)) classData[d.Class]++; });
    const defaults = getChartDefaults();

    charts.studentsPerClass = new Chart(document.getElementById('chartStudentsPerClass'), {
        type: 'bar',
        data: {
            labels: CLASS_ORDER,
            datasets: [{
                label: 'Students',
                data: CLASS_ORDER.map(c => classData[c]),
                backgroundColor: CLASS_ORDER.map((_, i) => CHART_PALETTE[i] + '99'),
                borderColor: CLASS_ORDER.map((_, i) => CHART_PALETTE[i]),
                borderWidth: 2,
                borderRadius: 8,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(30,41,59,0.95)', padding: 12, cornerRadius: 8 }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: defaults.color, font: { weight: '600' } } },
                y: { grid: { color: defaults.gridColor }, ticks: { color: defaults.color, stepSize: 5 }, beginAtZero: true }
            }
        }
    });
}

function createAgeDistributionChart() {
    const ages = {};
    filteredData.forEach(d => { ages[d.Age] = (ages[d.Age] || 0) + 1; });
    const sortedAges = Object.keys(ages).map(Number).sort((a, b) => a - b);
    const defaults = getChartDefaults();

    charts.ageDistribution = new Chart(document.getElementById('chartAgeDistribution'), {
        type: 'bar',
        data: {
            labels: sortedAges.map(a => a + ' yrs'),
            datasets: [{
                label: 'Students',
                data: sortedAges.map(a => ages[a]),
                backgroundColor: COLORS.purple + '80',
                borderColor: COLORS.purple,
                borderWidth: 2,
                borderRadius: 4,
                barPercentage: 0.7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(30,41,59,0.95)', padding: 12, cornerRadius: 8 }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: defaults.color, font: { size: 10 } } },
                y: { grid: { color: defaults.gridColor }, ticks: { color: defaults.color, stepSize: 5 }, beginAtZero: true }
            }
        }
    });
}

function createGenderByClassChart() {
    const classGender = {};
    CLASS_ORDER.forEach(c => classGender[c] = { Male: 0, Female: 0 });
    filteredData.forEach(d => { if (classGender[d.Class]) classGender[d.Class][d.Gender]++; });
    const defaults = getChartDefaults();

    charts.genderByClass = new Chart(document.getElementById('chartGenderByClass'), {
        type: 'bar',
        data: {
            labels: CLASS_ORDER,
            datasets: [
                {
                    label: 'Male',
                    data: CLASS_ORDER.map(c => classGender[c].Male),
                    backgroundColor: COLORS.info + '90',
                    borderColor: COLORS.info,
                    borderWidth: 2,
                    borderRadius: 4
                },
                {
                    label: 'Female',
                    data: CLASS_ORDER.map(c => classGender[c].Female),
                    backgroundColor: COLORS.pink + '90',
                    borderColor: COLORS.pink,
                    borderWidth: 2,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: defaults.color, font: { size: 11 } } },
                tooltip: { backgroundColor: 'rgba(30,41,59,0.95)', padding: 12, cornerRadius: 8 }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: defaults.color, font: { weight: '600' } } },
                y: { grid: { color: defaults.gridColor }, ticks: { color: defaults.color }, beginAtZero: true }
            }
        }
    });
}

function createIncomeLevelByClassChart() {
    const classIncome = {};
    CLASS_ORDER.forEach(c => classIncome[c] = { High: 0, Medium: 0, Low: 0 });
    filteredData.forEach(d => { if (classIncome[d.Class] && classIncome[d.Class].hasOwnProperty(d.Parent_Income_Level)) classIncome[d.Class][d.Parent_Income_Level]++; });
    const defaults = getChartDefaults();

    charts.incomeLevelByClass = new Chart(document.getElementById('chartIncomeLevelByClass'), {
        type: 'bar',
        data: {
            labels: CLASS_ORDER,
            datasets: [
                { label: 'High', data: CLASS_ORDER.map(c => classIncome[c].High), backgroundColor: COLORS.success + '90', borderColor: COLORS.success, borderWidth: 2, borderRadius: 4 },
                { label: 'Medium', data: CLASS_ORDER.map(c => classIncome[c].Medium), backgroundColor: COLORS.info + '90', borderColor: COLORS.info, borderWidth: 2, borderRadius: 4 },
                { label: 'Low', data: CLASS_ORDER.map(c => classIncome[c].Low), backgroundColor: COLORS.warning + '90', borderColor: COLORS.warning, borderWidth: 2, borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: defaults.color, font: { size: 11 } } },
                tooltip: { backgroundColor: 'rgba(30,41,59,0.95)', padding: 12, cornerRadius: 8 }
            },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: defaults.color, font: { weight: '600' } } },
                y: { stacked: true, grid: { color: defaults.gridColor }, ticks: { color: defaults.color }, beginAtZero: true }
            }
        }
    });
}

// ============ PAYMENTS CHARTS ============
function createLateDaysChart() {
    const ranges = { '0 days': 0, '1-7 days': 0, '8-14 days': 0, '15-21 days': 0, '22-30 days': 0 };
    filteredData.forEach(d => {
        const late = d.Late_Days;
        if (late === 0) ranges['0 days']++;
        else if (late <= 7) ranges['1-7 days']++;
        else if (late <= 14) ranges['8-14 days']++;
        else if (late <= 21) ranges['15-21 days']++;
        else ranges['22-30 days']++;
    });
    const labels = Object.keys(ranges);
    const defaults = getChartDefaults();

    charts.lateDays = new Chart(document.getElementById('chartLateDays'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Students',
                data: labels.map(l => ranges[l]),
                backgroundColor: [COLORS.success + '90', COLORS.info + '90', COLORS.warning + '90', COLORS.orange + '90', COLORS.danger + '90'],
                borderColor: [COLORS.success, COLORS.info, COLORS.warning, COLORS.orange, COLORS.danger],
                borderWidth: 2,
                borderRadius: 6,
                barPercentage: 0.65
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(30,41,59,0.95)', padding: 12, cornerRadius: 8 }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: defaults.color, font: { size: 10, weight: '600' } } },
                y: { grid: { color: defaults.gridColor }, ticks: { color: defaults.color }, beginAtZero: true }
            }
        }
    });
}

function createPaymentMethodByStatusChart() {
    const data = filteredData.filter(d => d.Payment_Method && d.Payment_Method !== '');
    const methods = [...new Set(data.map(d => d.Payment_Method))];
    const statuses = ['Full', 'Partial'];
    const datasets = statuses.map((status, i) => ({
        label: status === 'Full' ? 'Fully Paid' : 'Partial',
        data: methods.map(m => data.filter(d => d.Payment_Method === m && d.Payment_Status === status).length),
        backgroundColor: i === 0 ? COLORS.success + '90' : COLORS.warning + '90',
        borderColor: i === 0 ? COLORS.success : COLORS.warning,
        borderWidth: 2,
        borderRadius: 4
    }));
    const defaults = getChartDefaults();

    charts.paymentMethodByStatus = new Chart(document.getElementById('chartPaymentMethodByStatus'), {
        type: 'bar',
        data: { labels: methods, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: defaults.color, font: { size: 11 } } },
                tooltip: { backgroundColor: 'rgba(30,41,59,0.95)', padding: 12, cornerRadius: 8 }
            },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: defaults.color, font: { size: 10, weight: '600' } } },
                y: { stacked: true, grid: { color: defaults.gridColor }, ticks: { color: defaults.color }, beginAtZero: true }
            }
        }
    });
}

function createTopBalancesChart() {
    const sorted = [...filteredData].filter(d => d.Balance > 0).sort((a, b) => b.Balance - a.Balance).slice(0, 10);
    const defaults = getChartDefaults();

    charts.topBalances = new Chart(document.getElementById('chartTopBalances'), {
        type: 'bar',
        data: {
            labels: sorted.map(d => d.Student_Name),
            datasets: [{
                label: 'Outstanding Balance',
                data: sorted.map(d => d.Balance),
                backgroundColor: COLORS.danger + '80',
                borderColor: COLORS.danger,
                borderWidth: 2,
                borderRadius: 4,
                barPercentage: 0.65
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.95)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: { label: ctx => ` Balance: ${formatCurrency(ctx.raw)}` }
                }
            },
            scales: {
                x: { grid: { color: defaults.gridColor }, ticks: { color: defaults.color, callback: v => formatCurrency(v) } },
                y: { grid: { display: false }, ticks: { color: defaults.color, font: { size: 10 } } }
            }
        }
    });
}

function createStatusByIncomeChart() {
    const incomes = ['High', 'Medium', 'Low'];
    const statuses = ['Full', 'Partial', 'Unpaid'];
    const colors = [COLORS.success, COLORS.warning, COLORS.danger];
    const datasets = statuses.map((status, i) => ({
        label: status === 'Full' ? 'Fully Paid' : status,
        data: incomes.map(inc => filteredData.filter(d => d.Parent_Income_Level === inc && d.Payment_Status === status).length),
        backgroundColor: colors[i] + '90',
        borderColor: colors[i],
        borderWidth: 2,
        borderRadius: 4
    }));
    const defaults = getChartDefaults();

    charts.statusByIncome = new Chart(document.getElementById('chartStatusByIncome'), {
        type: 'bar',
        data: { labels: incomes.map(i => i + ' Income'), datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: defaults.color, font: { size: 11 } } },
                tooltip: { backgroundColor: 'rgba(30,41,59,0.95)', padding: 12, cornerRadius: 8 }
            },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: defaults.color, font: { weight: '600' } } },
                y: { stacked: true, grid: { color: defaults.gridColor }, ticks: { color: defaults.color }, beginAtZero: true }
            }
        }
    });
}

// ============ SCHOLARSHIP CHARTS ============
function createScholarshipByClassChart() {
    const classData = {};
    CLASS_ORDER.forEach(c => classData[c] = 0);
    filteredData.forEach(d => { if (classData.hasOwnProperty(d.Class)) classData[d.Class] += d.Scholarship_Amount; });
    const defaults = getChartDefaults();

    charts.scholarshipByClass = new Chart(document.getElementById('chartScholarshipByClass'), {
        type: 'bar',
        data: {
            labels: CLASS_ORDER,
            datasets: [{
                label: 'Scholarship Amount',
                data: CLASS_ORDER.map(c => classData[c]),
                backgroundColor: COLORS.accent + '90',
                borderColor: COLORS.accent,
                borderWidth: 2,
                borderRadius: 6,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.95)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: { label: ctx => ` Scholarship: ${formatCurrency(ctx.raw)}` }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: defaults.color, font: { weight: '600' } } },
                y: { grid: { color: defaults.gridColor }, ticks: { color: defaults.color, callback: v => formatCurrency(v) } }
            }
        }
    });
}

function createScholarshipByIncomeChart() {
    const incomes = ['High', 'Medium', 'Low'];
    const incomeData = {};
    incomes.forEach(i => incomeData[i] = 0);
    filteredData.forEach(d => { if (incomeData.hasOwnProperty(d.Parent_Income_Level)) incomeData[d.Parent_Income_Level] += d.Scholarship_Amount; });
    const defaults = getChartDefaults();

    charts.scholarshipByIncome = new Chart(document.getElementById('chartScholarshipByIncome'), {
        type: 'bar',
        data: {
            labels: incomes.map(i => i + ' Income'),
            datasets: [{
                label: 'Scholarship Total',
                data: incomes.map(i => incomeData[i]),
                backgroundColor: [COLORS.success + '90', COLORS.info + '90', COLORS.warning + '90'],
                borderColor: [COLORS.success, COLORS.info, COLORS.warning],
                borderWidth: 2,
                borderRadius: 6,
                barPercentage: 0.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.95)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: { label: ctx => ` Total: ${formatCurrency(ctx.raw)}` }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: defaults.color, font: { weight: '600' } } },
                y: { grid: { color: defaults.gridColor }, ticks: { color: defaults.color, callback: v => formatCurrency(v) } }
            }
        }
    });
}

function createScholarshipTiersChart() {
    const tiers = { 'No Scholarship': 0, '5,000': 0, '10,000': 0 };
    filteredData.forEach(d => {
        if (d.Scholarship_Amount === 0) tiers['No Scholarship']++;
        else if (d.Scholarship_Amount === 5000) tiers['5,000']++;
        else if (d.Scholarship_Amount === 10000) tiers['10,000']++;
    });
    const defaults = getChartDefaults();

    charts.scholarshipTiers = new Chart(document.getElementById('chartScholarshipTiers'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(tiers),
            datasets: [{
                data: Object.values(tiers),
                backgroundColor: [COLORS.teal + '99', COLORS.accent + '99', COLORS.purple + '99'],
                borderWidth: 3,
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#fff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom', labels: { color: defaults.color, font: { size: 11 } } },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.95)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.raw} students (${((ctx.raw / filteredData.length) * 100).toFixed(1)}%)`
                    }
                }
            }
        }
    });
}

function createScholarshipVsPaymentChart() {
    const statuses = ['Full', 'Partial', 'Unpaid'];
    const withScholarship = statuses.map(s => filteredData.filter(d => d.Payment_Status === s && d.Scholarship_Amount > 0).length);
    const withoutScholarship = statuses.map(s => filteredData.filter(d => d.Payment_Status === s && d.Scholarship_Amount === 0).length);
    const defaults = getChartDefaults();

    charts.scholarshipVsPayment = new Chart(document.getElementById('chartScholarshipVsPayment'), {
        type: 'bar',
        data: {
            labels: ['Fully Paid', 'Partial', 'Unpaid'],
            datasets: [
                {
                    label: 'With Scholarship',
                    data: withScholarship,
                    backgroundColor: COLORS.purple + '90',
                    borderColor: COLORS.purple,
                    borderWidth: 2,
                    borderRadius: 4
                },
                {
                    label: 'Without Scholarship',
                    data: withoutScholarship,
                    backgroundColor: COLORS.teal + '90',
                    borderColor: COLORS.teal,
                    borderWidth: 2,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: defaults.color, font: { size: 11 } } },
                tooltip: { backgroundColor: 'rgba(30,41,59,0.95)', padding: 12, cornerRadius: 8 }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: defaults.color, font: { weight: '600' } } },
                y: { grid: { color: defaults.gridColor }, ticks: { color: defaults.color }, beginAtZero: true }
            }
        }
    });
}

// ============ TABLE RENDERING ============
function renderTable() {
    const data = getFilteredTableData();
    const totalPages = Math.ceil(data.length / rowsPerPage);
    if (currentPage > totalPages) currentPage = 1;
    const start = (currentPage - 1) * rowsPerPage;
    const pageData = data.slice(start, start + rowsPerPage);

    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = pageData.map(d => `
        <tr>
            <td><strong>${d.Student_ID}</strong></td>
            <td>${d.Student_Name}</td>
            <td>${d.Class}</td>
            <td>${d.Gender}</td>
            <td>${d.Age}</td>
            <td>${formatCurrency(d.Total_Fees)}</td>
            <td>${formatCurrency(d.Amount_Paid)}</td>
            <td><strong style="color:${d.Balance > 0 ? 'var(--danger)' : 'var(--success)'}">${formatCurrency(d.Balance)}</strong></td>
            <td><span class="status-badge status-${d.Payment_Status.toLowerCase()}">${d.Payment_Status === 'Full' ? 'Paid' : d.Payment_Status}</span></td>
            <td>${d.Late_Days}</td>
            <td>${d.Scholarship_Amount > 0 ? formatCurrency(d.Scholarship_Amount) : '-'}</td>
            <td><span class="income-badge income-${d.Parent_Income_Level.toLowerCase()}">${d.Parent_Income_Level}</span></td>
            <td>${d.Payment_Method || '-'}</td>
        </tr>
    `).join('');

    document.getElementById('tableInfo').textContent = data.length === 0 ? 'No records found' : `Showing ${start + 1}-${Math.min(start + rowsPerPage, data.length)} of ${data.length} records`;
    renderPagination(totalPages);
}

function getFilteredTableData() {
    const searchTerm = (document.getElementById('tableSearch').value || '').toLowerCase();
    let data = [...filteredData];
    if (searchTerm) {
        data = data.filter(d =>
            d.Student_ID.toLowerCase().includes(searchTerm) ||
            d.Student_Name.toLowerCase().includes(searchTerm) ||
            d.Class.toLowerCase().includes(searchTerm)
        );
    }
    if (sortCol) {
        data.sort((a, b) => {
            let valA = a[sortCol], valB = b[sortCol];
            if (typeof valA === 'number') return sortDir === 'asc' ? valA - valB : valB - valA;
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
            return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
    }
    return data;
}

function renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    let html = '';
    if (currentPage > 1) html += `<button onclick="goToPage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<button disabled>...</button>`;
        }
    }
    if (currentPage < totalPages) html += `<button onclick="goToPage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderTable();
}

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });

    // Mobile menu
    document.getElementById('mobileMenuBtn').addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('mobile-open');
        document.getElementById('sidebarOverlay').classList.add('active');
    });
    document.getElementById('sidebarOverlay').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('mobile-open');
        document.getElementById('sidebarOverlay').classList.remove('active');
    });

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            switchSection(section);
            // Close mobile menu
            document.getElementById('sidebar').classList.remove('mobile-open');
            document.getElementById('sidebarOverlay').classList.remove('active');
        });
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
        refreshCharts();
    });

    // Filters
    ['filterClass', 'filterGender', 'filterStatus', 'filterIncome'].forEach(id => {
        document.getElementById(id).addEventListener('change', applyFilters);
    });
    document.getElementById('resetFilters').addEventListener('click', () => {
        document.getElementById('filterClass').value = 'all';
        document.getElementById('filterGender').value = 'all';
        document.getElementById('filterStatus').value = 'all';
        document.getElementById('filterIncome').value = 'all';
        applyFilters();
    });

    // Global search
    document.getElementById('globalSearch').addEventListener('input', (e) => {
        document.getElementById('tableSearch').value = e.target.value;
        if (currentSection === 'records') renderTable();
    });

    // Table search
    document.getElementById('tableSearch').addEventListener('input', () => {
        currentPage = 1;
        renderTable();
    });

    // Table sort
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            else { sortCol = col; sortDir = 'asc'; }
            renderTable();
        });
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', exportDashboardPDF);
    document.getElementById('printBtn').addEventListener('click', () => window.print());
    document.getElementById('exportTableBtn').addEventListener('click', exportTableCSV);
}

function switchSection(section) {
    currentSection = section;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-link[data-section="${section}"]`).classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + section).classList.add('active');

    const titles = {
        overview: 'Dashboard Overview',
        financial: 'Financial Analysis',
        students: 'Student Demographics',
        payments: 'Payment Insights',
        scholarships: 'Scholarship Analysis',
        records: 'Student Records'
    };
    document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';
    document.getElementById('breadcrumb').textContent = titles[section] || 'Overview';
}

function applyFilters() {
    const classFilter = document.getElementById('filterClass').value;
    const genderFilter = document.getElementById('filterGender').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const incomeFilter = document.getElementById('filterIncome').value;

    filteredData = allData.filter(d => {
        if (classFilter !== 'all' && d.Class !== classFilter) return false;
        if (genderFilter !== 'all' && d.Gender !== genderFilter) return false;
        if (statusFilter !== 'all' && d.Payment_Status !== statusFilter) return false;
        if (incomeFilter !== 'all' && d.Parent_Income_Level !== incomeFilter) return false;
        return true;
    });

    updateKPIs();
    refreshCharts();
    currentPage = 1;
    renderTable();
}

// ============ EXPORT FUNCTIONS ============
function exportDashboardPDF() {
    window.print();
}

function exportTableCSV() {
    const data = getFilteredTableData();
    const headers = ['Student_ID', 'Student_Name', 'Class', 'Gender', 'Age', 'Total_Fees', 'Amount_Paid', 'Balance', 'Payment_Status', 'Late_Days', 'Scholarship_Amount', 'Parent_Income_Level', 'Payment_Method'];
    const csvContent = [
        headers.join(','),
        ...data.map(d => headers.map(h => d[h]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student_records_export.csv';
    link.click();
    URL.revokeObjectURL(url);
}

// ============ INITIALIZE ============
document.addEventListener('DOMContentLoaded', loadData);
