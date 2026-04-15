import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';

/**
* ScoreUp Learning Engine
* Controls student behavior, AI flow, and learning structure
*/

const AI_MODES = {
    SOLVE: "SOLVE",
    EXPLAIN: "EXPLAIN",
    TEST_ME: "TEST_ME",
    FIX: "FIX",
    SUMMARY: "SUMMARY",
};

function detectMode(text) {
    const input = text.toLowerCase();

    if (input.includes("solve")) return AI_MODES.SOLVE;
    if (input.includes("explain")) return AI_MODES.EXPLAIN;
    if (input.includes("test")) return AI_MODES.TEST_ME;
    if (input.includes("mistake")) return AI_MODES.FIX;
    if (input.includes("summar")) return AI_MODES.SUMMARY;

    return null;
}

const FIREBASE_API_KEY = 'AIzaSyDv6Q6A806aaj3EjqzTzesSwV8J8DDC9Xo';
const FIREBASE_PROJECT_ID = 'scoreup-d7609';
const VALID_CODES = [
    'SCU-TEST-0001',
    'SCU-TEST-0002',
    'SCU-TEST-0003',
];
const saveStudentData = async (data) => {
    try {
        await SecureStore.setItemAsync('studentData', JSON.stringify(data));
    } catch (e) {
        console.log('Save error', e);
    }
};

const loadStudentData = async () => {
    try {
        const data = await SecureStore.getItemAsync('studentData');
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
};


const signUp = async (email, password, name, role, grade) => {
    try {
        const res = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key= AIzaSyDv6Q6A80aaj3EjqzTzesSwV8J8DDC9X0', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true })
        });
        const data = await res.json();
        setAuthError(data.error ? data.error.message : 'Success: ' + data.localId);
        if (data.error) return { error: data.error.message };
        localStorage.setItem('userToken', data.idToken);
        localStorage.setItem('userUid', data.localId);
        return { success: true, token: data.idToken, uid: data.localId };
    } catch (e) {
        return { error: 'Catch: ' + e.message + ' ' + e.toString() };
    }
};

const signIn = async (email, password) => {
    try {
        const res = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDv6Q6A80aaj3EjqzTzesSwV8J8DDC9X0', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true })
        });
        const data = await res.json();
        if (data.error) return { error: data.error.message };
        return { success: true, token: data.idToken, uid: data.localId };
    } catch (e) {
        return { error: e.message };
    }
};

const scheduleDailyReminder = async (hour, minute) => {
    await Notifications.requestPermissionsAsync();
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Time to study! 📚",
            body: "Your daily study session is waiting. Keep your streak going! 🔥",
        },
        trigger: {
            hour: hour,
            minute: minute,
            repeats: true,
        },
    });
};


export default function App() {
    useEffect(() => {
        const loadData = async () => {
            const data = await loadStudentData();
            if (data) {
                setName(data.name || '');
                setGrade(data.grade || '');
                setSelected(data.selected || []);
                setMarks(data.marks || {});
                setRole(data.role || 'student');
                setStreak(data.streak || 0);
                setIsSubscribed(data.isSubscribed || false);
                setNotifyHour(data.notifyHour || 18);
                setNotifyMinute(data.notifyMinute || 0);
                setReferralCode(data.referralCode || '');
                setReferralEarnings(data.referralEarnings || 0);
                const token = localStorage.getItem('userToken');
                if (token) {
                    setScreen('dashboard');
                } else {
                    setScreen('signup');
                }

            }
        };
        loadData();
    }, []);

    useEffect(() => {
        if (!sessionActive) return;
        const id = setInterval(() => {
            setSessionSeconds(s => {
                if (s + 1 >= sessionTarget) {
                    clearInterval(id);
                    setSessionActive(false);
                    setStreak(prev => prev + 1);
                    alert('🎉 Study session complete! Streak updated!');
                    return 0;
                }
                return s + 1;
            });
        }, 1000);
        return () => clearInterval(id);
    });

    const [screen, setScreen] = useState('splash');
    const [role, setRole] = useState('student');
    const [name, setName] = useState('');
    const [grade, setGrade] = useState('');
    const [selected, setSelected] = useState([]);
    const [marks, setMarks] = useState({});
    const [message, setMessage] = useState('');
    const [chat, setChat] = useState([]);
    const [loading, setLoading] = useState(false);
    const [qIndex, setQIndex] = useState(0);
    const [answered, setAnswered] = useState(null);
    const [score, setScore] = useState(0);
    const [done, setDone] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');
    const [uid, setUid] = useState('');
    const [authError, setAuthError] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [quizTopic, setQuizTopic] = useState('');
    const [aiQuestions, setAiQuestions] = useState([]);
    const [aiQ, setAiQ] = useState(null);
    const [aiAnswered, setAiAnswered] = useState(null);
    const [aiScore, setAiScore] = useState(0);
    const [aiDone, setAiDone] = useState(false);
    const [aiLoading, setAiLoading] = useState(true);
    const [sessionSubject, setSessionSubject] = useState('');
    const [sessionSeconds, setSessionSeconds] = useState(0);
    const [sessionActive, setSessionActive] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [sessionTarget, setSessionTarget] = useState(5400);
    const [streak, setStreak] = useState(0);
    const [referralCode, setReferralCode] = useState('');
    const [referralEarnings, setReferralEarnings] = useState(0);
    const [quizSubject, setQuizSubject] = useState('');
    const [quizScores, setQuizScores] = useState({});
    const [accessCode, setAccessCode] = useState('');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [notifyHour, setNotifyHour] = useState(18);
    const [notifyMinute, setNotifyMinute] = useState(0);

    const handleSendAI = async () => {
        // 1. figure out what student wants
        const mode = detectMode(userInput);

        // 2. if unclear, guide them (this is your cultural control)
        if (!mode) {
            setAiResponse(
                "Choose what you want: Solve / Explain / Test Me / Fix Mistake / Summarise"
            );
            return;
        }

        // 3. build structured prompt (controls AI behavior)
        const prompt = `
You are ScoreUp AI Tutor.

Mode: ${mode}

Student Input:
${userInput}

Rules:
- Explain clearly for high school students in South Africa
- Step-by-step if solving
- Keep it simple and structured
`;

        try {
            // 4. CALL YOUR AI (await ONLY allowed here)
            const response = await callAI(prompt);

            // 5. show result
            setAiResponse(response);
        } catch (error) {
            setAiResponse("Something went wrong. Try again.");
        }
    };

    if (screen === 'splash') {
        return (
            <ScrollView style={{ flex: 1, backgroundColor: '#1a52d4' }} contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 60 }}>
                <StatusBar barStyle="light-content" />
                <Text style={{ fontSize: 72, textAlign: 'center', marginBottom: 12 }}>🎓</Text>
                <Text style={{ fontSize: 36, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 }}>ScoreUp</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 32 }}>🇿🇦 South Africa's AI Study Companion</Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>🧠 AI Tutor for all CAPS subjects</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>📅 Smart planner and exam scheduling</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>🔁 Spaced repetition memory engine</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, marginBottom: 32 }}>
                    <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>👨‍👩‍👧 Parent insights and weekly reports</Text>
                </View>
                <TouchableOpacity onPress={() => setScreen('signup')} style={{ backgroundColor: '#F5C518', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#12183A' }}>Get Started 🚀</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setScreen('signin')}
                    style={{ borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>I have an account</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    }

    if (screen === 'signup') {
        return (
            <ScrollView style={{ flex: 1, backgroundColor: '#F7F8FC' }} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
                <Text style={{ fontSize: 40, textAlign: 'center' }}>🎓</Text>
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#12183A', textAlign: 'center', marginTop: 8, marginBottom: 24 }}>Create Account</Text>
                <View style={{ flexDirection: 'row', backgroundColor: '#EEF0F8', borderRadius: 12, padding: 4, marginBottom: 20 }}>
                    <TouchableOpacity onPress={() => setRole('student')} style={{ flex: 1, paddingVertical: 10, borderRadius: 9, backgroundColor: role === 'student' ? '#fff' : 'transparent', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '700', color: role === 'student' ? '#3A86FF' : '#5A6282' }}>👨‍🎓 Student</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setRole('parent')} style={{ flex: 1, paddingVertical: 10, borderRadius: 9, backgroundColor: role === 'parent' ? '#fff' : 'transparent', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '700', color: role === 'parent' ? '#3A86FF' : '#5A6282' }}>👨‍👩‍👧 Parent</Text>
                    </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#9BA3BE', letterSpacing: 1, marginBottom: 6 }}>FULL NAME</Text>
                <TextInput value={name} onChangeText={setName} placeholder="e.g. Thabo Mokoena" style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1.5, borderColor: 'rgba(20,30,80,0.09)', marginBottom: 20 }} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#9BA3BE', letterSpacing: 1, marginBottom: 6, marginTop: 14 }}>EMAIL</Text>
                <TextInput value={email} onChangeText={setEmail} placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none" style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1.5, borderColor: 'rgba(20,30,80,0.09)', marginBottom: 14 }} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#9BA3BE', letterSpacing: 1, marginBottom: 6 }}>PASSWORD</Text>
                <TextInput value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1.5, borderColor: 'rgba(20,30,80,0.09)', marginBottom: 14 }} />

                {authError ? <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600', marginBottom: 10, textAlign: 'center' }}>{authError}</Text> : null}
                <TouchableOpacity onPress={() => setScreen('grade')} style={{ backgroundColor: '#3A86FF', borderRadius: 14, padding: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Create Account →</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setScreen('splash')} style={{ alignItems: 'center', marginTop: 16 }}>
                    <Text style={{ color: '#9BA3BE', fontSize: 13 }}>← Back</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    }

    if (screen === 'grade') {
        const phases = [
            { phase: '🏫 Foundation Phase', grades: ['Grade 1', 'Grade 2', 'Grade 3'] },
            { phase: '📗 Intermediate Phase', grades: ['Grade 4', 'Grade 5', 'Grade 6'] },
            { phase: '📘 Senior Phase', grades: ['Grade 7', 'Grade 8', 'Grade 9'] },
            { phase: '📙 FET Phase', grades: ['Grade 10', 'Grade 11', 'Grade 12'] },
        ];
        return (
            <ScrollView style={{ flex: 1, backgroundColor: '#F7F8FC' }} contentContainerStyle={{ padding: 22, paddingTop: 60 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#12183A', marginBottom: 6 }}>What grade are you in? 📚</Text>
                <Text style={{ fontSize: 13, color: '#5A6282', marginBottom: 24 }}>We will load your CAPS subjects automatically.</Text>
                {phases.map(({ phase, grades }) => (
                    <View key={phase} style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#9BA3BE', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>{phase}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {grades.map((g) => (
                                <TouchableOpacity key={g} onPress={() => setGrade(g)} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: grade === g ? '#3A86FF' : '#fff', borderWidth: 1.5, borderColor: grade === g ? '#3A86FF' : 'rgba(20,30,80,0.09)', minWidth: 90, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: grade === g ? '#fff' : '#5A6282' }}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}
                <TouchableOpacity onPress={() => setScreen('subjects')} disabled={!grade} style={{ backgroundColor: grade ? '#3A86FF' : '#9BA3BE', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Next — Choose Subjects →</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setScreen('signup')} style={{ alignItems: 'center', marginTop: 16 }}>
                    <Text style={{ color: '#9BA3BE', fontSize: 13 }}>← Back</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    }
    if (screen === 'subjects') {
        const CAPS = {
            'Grade 1': { mandatory: ['Mathematics', 'English Home Language', 'Life Skills'], elective: [] },
            'Grade 2': { mandatory: ['Mathematics', 'English Home Language', 'Life Skills'], elective: [] },
            'Grade 3': { mandatory: ['Mathematics', 'English Home Language', 'Life Skills', 'Technology'], elective: [] },
            'Grade 4': { mandatory: ['Mathematics', 'English Home Language', 'Life Skills', 'Natural Sciences', 'Social Sciences'], elective: ['Creative Arts', 'Afrikaans FAL'] },
            'Grade 5': { mandatory: ['Mathematics', 'English Home Language', 'Life Skills', 'Natural Sciences', 'Social Sciences'], elective: ['Creative Arts', 'Afrikaans FAL'] },
            'Grade 6': { mandatory: ['Mathematics', 'English Home Language', 'Life Skills', 'Natural Sciences', 'Social Sciences'], elective: ['Creative Arts', 'Afrikaans FAL'] },
            'Grade 7': { mandatory: ['Mathematics', 'English Home Language', 'Life Orientation', 'Natural Sciences', 'Social Sciences', 'Technology'], elective: ['EMS', 'Creative Arts', 'Afrikaans FAL'] },
            'Grade 8': { mandatory: ['Mathematics', 'English Home Language', 'Life Orientation', 'Natural Sciences', 'Social Sciences', 'Technology'], elective: ['EMS', 'Creative Arts', 'Afrikaans FAL'] },
            'Grade 9': { mandatory: ['Mathematics', 'English Home Language', 'Life Orientation', 'Natural Sciences', 'Social Sciences', 'Technology'], elective: ['EMS', 'Creative Arts', 'Afrikaans FAL'] },
            'Grade 10': { mandatory: ['English Home Language', 'Life Orientation'], elective: ['Mathematics', 'Maths Literacy', 'Physical Sciences', 'Life Sciences', 'History', 'Geography', 'Accounting', 'Business Studies', 'Economics', 'Tourism', 'Cat', 'Consumers'] },
            'Grade 11': { mandatory: ['English Home Language', 'Life Orientation'], elective: ['Mathematics', 'Maths Literacy', 'Physical Sciences', 'Life Sciences', 'History', 'Geography', 'Accounting', 'Business Studies', 'Economics', 'Tourism', 'Cat', 'Consumers'] },
            'Grade 12': { mandatory: ['English Home Language', 'Life Orientation'], elective: ['Mathematics', 'Maths Literacy', 'Physical Sciences', 'Life Sciences', 'History', 'Geography', 'Accounting', 'Business Studies', 'Economics', 'Tourism', 'Cat', 'Consumers'] },
        };
        const data = CAPS[grade] || { mandatory: [], elective: [] };
        if (selected.length === 0 && data.mandatory.length > 0) setSelected([...data.mandatory]);

        const toggle = (sub) => {
            if (data.mandatory.includes(sub)) return;
            setSelected((prev) => prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]);
        };
        return (
            <ScrollView style={{ flex: 1, backgroundColor: '#F7F8FC' }} contentContainerStyle={{ padding: 22, paddingTop: 60 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#12183A', marginBottom: 6 }}>Pick your subjects ✅</Text>
                <Text style={{ fontSize: 13, color: '#5A6282', marginBottom: 24 }}>{grade} · Tap electives to add them.</Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#9BA3BE', letterSpacing: 1, marginBottom: 10 }}>MANDATORY</Text>
                {data.mandatory.map((sub) => (
                    <View key={sub} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#16C79A15', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#16C79A40', marginBottom: 8 }}>
                        <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: '#16C79A', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#12183A' }}>{sub}</Text>
                        <Text style={{ fontSize: 10, color: '#16C79A', fontWeight: '700' }}>Required</Text>
                    </View>
                ))}
                {data.elective.length > 0 && (
                    <View style={{ marginTop: 16 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#9BA3BE', letterSpacing: 1, marginBottom: 10 }}>ELECTIVES</Text>
                        {data.elective.map((sub) => {
                            const on = selected.includes(sub);
                            return (
                                <TouchableOpacity key={sub} onPress={() => toggle(sub)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: on ? '#E8F1FF' : '#fff', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: on ? '#3A86FF40' : 'rgba(20,30,80,0.09)', marginBottom: 8 }}>
                                    <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: on ? '#3A86FF' : '#EEF0F8', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                        {on && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}
                                    </View>
                                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: on ? '#12183A' : '#5A6282' }}>{sub}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
                <View style={{ backgroundColor: '#EEF0F8', borderRadius: 12, padding: 12, marginTop: 8, marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#5A6282' }}>{selected.length} subjects selected</Text>
                </View>
                <TouchableOpacity onPress={() => setScreen('marks')} style={{ backgroundColor: '#3A86FF', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Next — Add Marks →</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={async () => {
                    if (!email || !password) {
                        setAuthError('Please fill in all fields');
                        return;
                    }
                    const result = await signUp(email, password, name, role);
                    if (result.error) {
                        setAuthError('Error: ' + result.error);
                    } else {
                        setToken(result.token);
                        setUid(result.uid);
                        setScreen('grade');
                    }
                }}
                    style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#9BA3BE', fontSize: 13 }}>← Back</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    }

    if (screen === 'marks') {
        return (
            <ScrollView style={{ flex: 1, backgroundColor: '#F7F8FC' }} contentContainerStyle={{ padding: 22, paddingTop: 60, paddingBottom: 60 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#12183A', marginBottom: 6 }}>Enter your report marks 📊</Text>
                <Text style={{ fontSize: 13, color: '#5A6282', marginBottom: 24 }}>This is your starting point. We track improvement from here.</Text>
                {selected.map((sub) => {
                    const val = parseInt(marks[sub] || '0');
                    const col = val >= 70 ? '#16C79A' : val >= 50 ? '#F7962B' : '#EF4444';
                    return (
                        <View key={sub} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: 'rgba(20,30,80,0.09)' }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#12183A', marginBottom: 10 }}>{sub}</Text>
                            <View style={{ height: 5, backgroundColor: '#EEF0F8', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                                <View style={{ height: '100%', width: val + '%', backgroundColor: col, borderRadius: 4 }} />
                            </View>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => {
                                    const active = marks[sub] === String(v);
                                    return (
                                        <TouchableOpacity key={v} onPress={() => setMarks((p) => ({ ...p, [sub]: String(v) }))} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: active ? col : '#EEF0F8', borderWidth: 1.5, borderColor: active ? col : 'rgba(20,30,80,0.09)' }}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : '#5A6282' }}>{v}%</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {marks[sub] && (
                                <Text style={{ fontSize: 12, fontWeight: '700', color: col, marginTop: 8 }}>
                                    Selected: {marks[sub]}% {val >= 70 ? '✅' : val >= 50 ? '⚠️' : '❌'}
                                </Text>
                            )}
                        </View>
                    );
                })}
                <TouchableOpacity onPress={async () => {
                    const code = name.replace(/\s/g, '').toUpperCase().substring(0, 5) + Math.floor(Math.random() * 1000);
                    setReferralCode(code);
                    await saveStudentData({ name, grade, selected, marks, role, uid, streak, referralCode: code, isSubscribed });
                    scheduleDailyReminder();
                    setScreen('dashboard');
                }} style={{ backgroundColor: '#16C79A', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Lets Study! 🚀</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setScreen('subjects')} style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#9BA3BE', fontSize: 13 }}>← Back</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    }
    if (screen === 'dashboard') {
        const entered = selected.filter((s) => marks[s] && marks[s] !== '');
        const avg = entered.length > 0 ? Math.round(entered.reduce((sum, s) => sum + parseInt(marks[s] || '0'), 0) / entered.length) : 0;
        const emoji = avg >= 80 ? '🏆' : avg >= 70 ? '⭐' : avg >= 60 ? '📈' : avg >= 50 ? '💪' : '🎯';
        const label = avg >= 80 ? 'Outstanding Learner' : avg >= 70 ? 'Merit Learner' : avg >= 60 ? 'Achieving Learner' : avg >= 50 ? 'Developing Learner' : 'Needs Support';
        const color = avg >= 70 ? '#16C79A' : avg >= 50 ? '#F7962B' : '#EF4444';
        return (
            <ScrollView style={{ flex: 1, backgroundColor: '#F7F8FC' }} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
                    <View>
                        <Text style={{ fontSize: 13, color: '#5A6282', fontWeight: '600', marginBottom: 3 }}>Welcome back 👋</Text>
                        <Text style={{ fontSize: 26, fontWeight: '800', color: '#12183A' }}>{name || 'Student'}</Text>
                        <Text style={{ fontSize: 12, color: '#5A6282', marginTop: 2 }}>{grade}</Text>
                    </View>
                    <View style={{ backgroundColor: '#16C79A18', borderRadius: 14, padding: 12, alignItems: 'center' }}>
                        <Text style={{ fontSize: 20 }}>🔥</Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#16C79A' }}>{streak}</Text>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#16C79A' }}>STREAK</Text>
                    </View>
                </View>
                <View style={{ backgroundColor: color + '18', borderRadius: 16, padding: 16, marginBottom: 18, borderWidth: 1.5, borderColor: color + '30', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <Text style={{ fontSize: 36 }}>{emoji}</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: color, textTransform: 'uppercase', letterSpacing: 0.8 }}>Learner Rating</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#12183A', marginTop: 2 }}>{label}</Text>
                        <Text style={{ fontSize: 22, fontWeight: '800', color: color }}>{avg}% Average</Text>
                    </View>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#12183A', marginBottom: 12 }}>📚 Your Subjects</Text>
                {selected.map((sub, i) => {
                    const mark = parseInt(marks[sub] || '0');
                    const col = mark >= 70 ? '#16C79A' : mark >= 50 ? '#F7962B' : '#EF4444';
                    return (
                        <View key={i} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(20,30,80,0.09)' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#12183A', flex: 1 }}>{sub}</Text>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: col }}>{mark > 0 ? mark + '%' : '-'}</Text>
                            </View>
                            <View style={{ height: 5, backgroundColor: '#EEF0F8', borderRadius: 4, overflow: 'hidden' }}>
                                <View style={{ height: '100%', width: mark + '%', backgroundColor: col, borderRadius: 4 }} />
                            </View>
                        </View>
                    );
                })}
                <TouchableOpacity onPress={() => { if (!isSubscribed) { setScreen('locked'); } else { setScreen('tutor'); } }} style={{ backgroundColor: '#E8F1FF', borderRadius: 14, padding: 14, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#3A86FF', marginBottom: 3 }}>🧠 AI Tutor</Text>
                    <Text style={{ fontSize: 12, color: '#5A6282' }}>Ask me anything about your CAPS subjects!</Text>
                </TouchableOpacity><TouchableOpacity onPress={() => { if (!isSubscribed) { setScreen('locked'); } else { setScreen('planner'); } }} style={{ backgroundColor: '#F3EEFF', borderRadius: 14, padding: 14, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#8B5CF6', marginBottom: 3 }}>📅 Study Planner</Text>
                    <Text style={{ fontSize: 12, color: '#5A6282' }}>Your weekly study schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { if (!isSubscribed) { setScreen('locked'); } else { setQuizSubject(''); setScreen('quiz'); } }} style={{ backgroundColor: '#FFF4E8', borderRadius: 14, padding: 14, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#F7962B', marginBottom: 3 }}>🧪 Quiz Me</Text>
                    <Text style={{ fontSize: 12, color: '#5A6282' }}>Test yourself with spaced repetition</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { if (!isSubscribed) { setScreen('locked'); } else { setScreen('parent'); } }} style={{ backgroundColor: '#E3F9F3', borderRadius: 14, padding: 14, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#16C79A', marginBottom: 3 }}>👨‍👩‍👧 Parent View</Text>
                    <Text style={{ fontSize: 12, color: '#5A6282' }}>See your child's progress</Text>
                </TouchableOpacity>
                {(grade === 'Grade 10' || grade === 'Grade 11' || grade === 'Grade 12') && (
                    <TouchableOpacity onPress={() => Linking.openURL('https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations.aspx')} style={{ backgroundColor: '#12183A18', borderRadius: 14, padding: 14, marginTop: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#12183A', marginBottom: 3 }}>📄 Past Papers & Memos</Text>
                        <Text style={{ fontSize: 12, color: '#5A6282' }}>Grade 10-12 NSC past papers</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setScreen('referral')} style={{ backgroundColor: '#16C79A18', borderRadius: 14, padding: 14, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#16C79A', marginBottom: 3 }}>🎁 My Referral Code</Text>
                    <Text style={{ fontSize: 12, color: '#5A6282' }}>Earn R10/month for every friend you refer</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setScreen('settings')} style={{ backgroundColor: '#EEF0F8', borderRadius: 14, padding: 14, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#12183A', marginBottom: 3 }}>⚙️ Settings</Text>
                    <Text style={{ fontSize: 12, color: '#5A6282' }}>Update your marks and profile</Text>
                </TouchableOpacity>{!isSubscribed && (
                    <TouchableOpacity onPress={() => setScreen('activate')} style={{ backgroundColor: '#FFF4E8', borderRadius: 14, padding: 14, marginTop: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#F7962B', marginBottom: 3 }}>⚡ Activate Full Access</Text>
                        <Text style={{ fontSize: 12, color: '#5A6282' }}>Enter your access code to unlock everything</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => Linking.openURL('https://score-up-genius.lovable.app')} style={{ backgroundColor: '#3A86FF18', borderRadius: 14, padding: 14, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#3A86FF', marginBottom: 3 }}>⭐ Subscribe — R200/month</Text>
                    <Text style={{ fontSize: 12, color: '#5A6282' }}>First month R160 with promo code </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={async () => { await SecureStore.deleteItemAsync('studentData'); setName(''); setGrade(''); setSelected([]); setMarks({}); setEmail(''); setPassword(''); setToken(''); setUid(''); setScreen('splash'); }} style={{ backgroundColor: '#FFF0F0', borderRadius: 14, padding: 14, marginTop: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#EF4444' }}>Sign Out</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    }

    <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center' }}>🧠 AI Tutor</Text>
        <Text style={{ fontSize: 13, color: '#5A6282', textAlign: 'center' }}>Ask me anything about your CAPS subjects. I will explain it simply!</Text>
    </View>





    if (screen === 'tutor') {

        const sendMessage = async () => {
            if (!message.trim()) return;

            const userMsg = message;
            setMessage('');

            setChat((prev) => [...prev, { role: 'user', text: userMsg }]);

            setLoading(true);

            try {

                // 🧠 STEP 1: detect mode (YOUR CULTURAL LAYER)
                const mode = detectMode(userMsg);

                // 🧠 STEP 2: build smarter message (CONTROL LAYER)
                const enhancedMsg = `
Mode: ${mode || "FREE_CHAT"}

Student Question:
${userMsg}

Instruction:
If mode is FREE_CHAT, guide student into Solve / Explain / Test / Fix / Summarise.
If mode is set, respond accordingly like a South African teacher.
`;
                console.log("SENDING:", msg, grade);
                const res = await fetch("https://scoreup-topaz.vercel.app/api/ai", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        msg,
                        grade
                    })
                });

                const data = await res.json();

                console.log("AI RESPONSE:", data);

                setAiQ(data.reply);

                setChat((prev) => [
                    ...prev,
                    {
                        role: 'ai',
                        text: reply,
                        topic: userMsg,
                        showQuiz: true,
                        youtubeQuery: userMsg + ' grade ' + grade + ' CAPS South Africa'
                    }
                ]);

            } catch (e) {
                console.log('Error:', e.message);
            } finally {
                setLoading(false);
            }
        };

        return (
            <View style={{ flex: 1, backgroundColor: '#F7F8FC' }}>
                <View style={{ backgroundColor: '#3A86FF', padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setScreen('dashboard')} style={{ marginRight: 12 }}>
                        <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
                    </TouchableOpacity>
                    {sessionActive && (
                        <TouchableOpacity onPress={() => { setSessionActive(false); setSessionSeconds(0); setScreen('planner'); }} style={{ backgroundColor: '#EF444420', margin: 12, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444' }}>⏹ End Study Session</Text>
                        </TouchableOpacity>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>🤖 AI Tutor {sessionActive ? '— ' + sessionSubject : ''}</Text>
                        {sessionActive && (
                            <Text style={{ fontSize: 12, color: '#ffffff90', marginTop: 2 }}>⏱ {sessionActive ? 'Active' : 'Inactive'} — {Math.floor(sessionSeconds / 60)}m {sessionSeconds % 60}s</Text>
                        )}
                    </View>
                </View>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                    {chat.length === 0 && (
                        <View style={{ alignItems: 'center', paddingTop: 40 }}>
                            <Text style={{ fontSize: 48, marginBottom: 12 }}>🧠</Text>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#12183A', marginBottom: 8 }}>Ask me anything!</Text>
                            <Text style={{ fontSize: 13, color: '#5A6282', textAlign: 'center' }}>I know all your {grade} CAPS subjects</Text>
                        </View>
                    )}
                    {chat.map((msg, i) => (
                        <View key={i} style={{ marginBottom: 12, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            <View style={{ backgroundColor: msg.role === 'user' ? '#3A86FF' : '#fff', borderRadius: 14, padding: 12, maxWidth: '85%', borderWidth: 1, borderColor: msg.role === 'user' ? '#3A86FF' : 'rgba(20,30,80,0.09)' }}>
                                <Text style={{ fontSize: 13, color: msg.role === 'user' ? '#fff' : '#12183A', lineHeight: 20 }}>{msg.text}</Text>
                            </View>
                            {msg.role === 'ai' && msg.showQuiz && (
                                <View style={{ marginTop: 8, gap: 8 }}>
                                    <TouchableOpacity
                                        onPress={async () => {
                                            setAiLoading(true);
                                            setAiQ(null);
                                            setAiAnswered(null);
                                            setAiScore(0);
                                            setAiDone(false);
                                            setQuizTopic(msg.topic);
                                            try {

                                                try {
                                                    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
                                                    setAiQ(parsed);
                                                } catch {
                                                    const fallbacks = {
                                                        'Mathematics': { question: 'What is the value of x in 2x + 4 = 10?', options: ['x = 2', 'x = 3', 'x = 4', 'x = 5'], correct: 1 },
                                                        'Life Sciences': { question: 'What is photosynthesis?', options: ['How animals breathe', 'How plants make food using sunlight', 'How cells divide', 'How blood circulates'], correct: 1 },
                                                        'Physical Sciences': { question: "What is Newton's First Law?", options: ['F = ma', 'An object stays at rest unless acted on', 'Every action has equal reaction', 'Energy is conserved'], correct: 1 },
                                                        'History': { question: 'When did SA become a democracy?', options: ['1990', '1992', '1994', '1996'], correct: 2 },
                                                        'Geography': { question: 'What is a watershed?', options: ['A type of rainfall', 'Land that drains into a river', 'A dam wall', 'An ocean current'], correct: 1 },
                                                    };
                                                    const fallback = fallbacks[sessionSubject] || { question: 'What is the most important study habit?', options: ['Cramming', 'Consistent daily study', 'Only studying before exams', 'Skipping difficult topics'], correct: 1 };
                                                    setAiQ(fallback);
                                                }

                                            } catch (e) {
                                                setAiQ(null);
                                            }
                                            setAiLoading(false);
                                            setScreen('aiquiz');
                                        }}

                                        style={{ backgroundColor: '#F7962B18', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#F7962B30', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#F7962B' }}>🧪 Quiz yourself on this topic</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => { const query = encodeURIComponent(msg.topic + ' grade ' + grade + ' CAPS South Africa'); Linking.openURL('https://www.youtube.com/results?search_query=' + query); }}
                                        style={{ backgroundColor: '#EF444418', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#EF444430', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444' }}>▶️ Find YouTube video on this</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))
                    }

                    {
                        loading && (
                            <View style={{ alignItems: 'flex-start', marginBottom: 12 }}>
                                <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(20,30,80,0.09)' }}>
                                    <Text style={{ fontSize: 13, color: '#5A6282' }}>Thinking...</Text>
                                </View>
                            </View>
                        )
                    }
                </ScrollView >
                <View style={{ flexDirection: 'row', padding: 16, gap: 10, backgroundColor: '#fff', borderTopWidth: 1, borderColor: 'rgba(20,30,80,0.09)' }}>
                    <TextInput value={message} onChangeText={setMessage} placeholder="Ask anything about your subjects..." style={{ flex: 1, backgroundColor: '#F7F8FC', borderRadius: 12, padding: 12, fontSize: 13, borderWidth: 1.5, borderColor: 'rgba(20,30,80,0.09)' }} />
                    <TouchableOpacity onPress={sendMessage} style={{ backgroundColor: '#3A86FF', borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>→</Text>
                    </TouchableOpacity>
                </View>
            </View >
        );
    }


    if (screen === 'planner') {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return (
            <View style={{ flex: 1, backgroundColor: '#F7F8FC' }}>
                <View style={{ backgroundColor: '#8B5CF6', padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setScreen('dashboard')} style={{ marginRight: 12 }}>
                        <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>📅 Study Planner</Text>
                </View>
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#12183A', marginBottom: 16 }}>This Week</Text>
                    {days.map((day) => (
                        <View key={day} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(20,30,80,0.09)' }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#12183A', marginBottom: 8 }}>{day}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {selected.filter((sub, subIndex) => {
                                    const dayIndex = days.indexOf(day);
                                    const isWeekend = dayIndex >= 5;
                                    const maxSubjects = isWeekend ? 2 : dayIndex % 2 === 0 ? 3 : 2;
                                    const mark = parseInt(marks[sub] || '0');
                                    const priority = mark < 50 ? 0 : mark < 60 ? 1 : mark < 70 ? 2 : mark < 80 ? 3 : 4;
                                    const sortedSelected = [...selected].sort((a, b) => {
                                        const ma = parseInt(marks[a] || '0');
                                        const mb = parseInt(marks[b] || '0');
                                        return ma - mb;
                                    });
                                    const position = sortedSelected.indexOf(sub);
                                    return position < maxSubjects;
                                })
                                    .map((sub) => {
                                        const mark = parseInt(marks[sub] || '0');
                                        const quizMark = quizScores[sub] ? Math.round((quizScores[sub].correct / quizScores[sub].total) * 100) : null;
                                        const displayMark = quizMark !== null ? Math.round((mark + quizMark) / 2) : mark;
                                        const hours = mark < 50 ? '2hrs' : mark < 60 ? '1.5hrs' : mark < 70 ? '1hr' : mark < 80 ? '45min' : '30min';
                                        const col = mark < 50 ? '#EF4444' : mark < 60 ? '#F7962B' : mark < 70 ? '#F5C518' : mark < 80 ? '#3A86FF' : '#16C79A';
                                        const risk = mark < 50 ? '🔴 Critical' : mark < 60 ? '🟠 At Risk' : mark < 70 ? '🟡 Developing' : mark < 80 ? '🟢 Good' : '⭐ Strong';
                                        return (
                                            <TouchableOpacity key={sub} onPress={() => { setSessionSubject(sub); setShowSessionModal(true); }} style={{ backgroundColor: col + '18', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: col + '30', marginBottom: 4, width: '100%' }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: col, flex: 1 }}>{sub}</Text>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: col }}>{hours}</Text>
                                                </View>
                                                <Text style={{ fontSize: 10, color: col, marginTop: 2 }}>{risk}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                            </View>
                        </View>
                    ))}
                </ScrollView>
                {showSessionModal && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%' }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: '#12183A', marginBottom: 8 }}>Ready to study? 📚</Text>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#8B5CF6', marginBottom: 16 }}>{sessionSubject}</Text>
                            <Text style={{ fontSize: 13, color: '#5A6282', marginBottom: 24 }}>A timer will track your study session. The AI Tutor will focus on this subject.</Text>
                            <TouchableOpacity onPress={() => {
                                const mark = parseInt(marks[sessionSubject] || '0');
                                const target = mark < 50 ? 7200 : mark < 70 ? 5400 : mark < 80 ? 2700 : 1800;
                                setSessionTarget(target);
                                setShowSessionModal(false);
                                setSessionActive(true);
                                setSessionSeconds(0);
                                setScreen('tutor');
                            }}
                                style={{ backgroundColor: '#8B5CF6', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 }}>
                                <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>▶️ Start Study Session</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowSessionModal(false)} style={{ borderRadius: 14, padding: 16, alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#9BA3BE' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    }

    if (screen === 'quiz') {
        const questionBank = {
            'Mathematics': { question: 'What is the value of x in 2x + 4 = 10?', options: ['x = 2', 'x = 3', 'x = 4', 'x = 5'], correct: 1 },
            'English Home Language': { question: 'What is a metaphor?', options: ['A direct comparison using like or as', 'A comparison without using like or as', 'A type of poem', 'A punctuation mark'], correct: 1 },
            'Life Sciences': { question: 'What is photosynthesis?', options: ['How animals breathe', 'How plants make food using sunlight', 'How cells divide', 'How blood circulates'], correct: 1 },
            'Physical Sciences': { question: 'What is Newton\'s First Law?', options: ['Force equals mass times acceleration', 'An object stays at rest unless acted on by a force', 'Every action has an equal reaction', 'Energy cannot be created or destroyed'], correct: 1 },
            'History': { question: 'When did South Africa become a democracy?', options: ['1990', '1992', '1994', '1996'], correct: 2 },
            'Geography': { question: 'What is a watershed?', options: ['A type of rainfall', 'Land that drains into a river system', 'A dam wall', 'An ocean current'], correct: 1 },
            'Accounting': { question: 'What is a balance sheet?', options: ['A list of expenses', 'A statement of assets and liabilities', 'A profit calculation', 'A cash flow statement'], correct: 1 },
            'Business Studies': { question: 'What is entrepreneurship?', options: ['Working for a company', 'Starting and running your own business', 'Investing in stocks', 'Managing employees'], correct: 1 },
            'Economics': { question: 'What is inflation?', options: ['Decrease in prices', 'Increase in general price levels', 'Increase in employment', 'Decrease in interest rates'], correct: 1 },
            'Life Orientation': { question: 'What is a constitutional right?', options: ['A school rule', 'A right given by parents', 'A right protected by the Constitution', 'A right given by teachers'], correct: 2 },
            'Natural Sciences': { question: 'What is the chemical symbol for water?', options: ['WA', 'H2O', 'HO2', 'W2O'], correct: 1 },
            'Social Sciences': { question: 'What is democracy?', options: ['Rule by one person', 'Rule by the military', 'Rule by the people', 'Rule by religion'], correct: 2 },
            'Technology': { question: 'What is the purpose of a flowchart?', options: ['To draw pictures', 'To show steps in a process', 'To calculate numbers', 'To write code'], correct: 1 },
            'Afrikaans FAL': { question: 'What is a "selfstandige naamwoord"?', options: ['A verb', 'An adjective', 'A noun', 'An adverb'], correct: 2 },
            'Economic Management Sciences': { question: 'What is a budget?', options: ['Money in the bank', 'A plan for income and expenses', 'A type of loan', 'A tax form'], correct: 1 },
            'Mathematical Literacy': { question: 'If you earn R5000 and spend R3500, how much do you save?', options: ['R1000', 'R1500', 'R2000', 'R2500'], correct: 1 },
        };

        if (!quizSubject) {
            return (
                <View style={{ flex: 1, backgroundColor: '#F7F8FC' }}>
                    <View style={{ backgroundColor: '#F7962B', padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => { setQuizSubject(' '); setScreen('dashboard'); }} style={{ marginRight: 12 }}>
                            <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>🧪 Quiz Me</Text>
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#12183A', marginBottom: 6 }}>Which subject do you want to quiz on?</Text>
                        <Text style={{ fontSize: 13, color: '#5A6282', marginBottom: 20 }}>Pick a subject to get started</Text>
                        {selected.map((sub, i) => {
                            const mark = parseInt(marks[sub] || '0');
                            const col = mark < 50 ? '#EF4444' : mark < 70 ? '#F7962B' : '#16C79A';
                            return (
                                <TouchableOpacity key={i} onPress={() => setQuizSubject(sub)} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(20,30,80,0.09)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#12183A' }}>{sub}</Text>
                                    <View style={{ backgroundColor: col + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '800', color: col }}>{mark}%</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            );
        }

        const questions = selected
            .filter((sub) => sub === quizSubject)
            .map((sub) => ({
                subject: sub,
                question: questionBank[sub]?.question || 'What is the main concept in ' + sub + '?',
                options: questionBank[sub]?.options || ['Option A', 'Option B', 'Option C', 'Option D'],
                correct: questionBank[sub]?.correct ?? 0,
                mark: parseInt(marks[sub] || '0'),
            }));

        const current = questions[qIndex];
        if (!current) return null;


        const answer = (i) => {
            if (answered !== null) return;
            setAnswered(i);
            if (i === current.correct) setScore((s) => s + 1);
            setQuizScores((prev) => {
                const subScores = prev[current.subject] || { correct: 0, total: 0 };
                return {
                    ...prev,
                    [current.subject]: {
                        correct: i === current.correct ? subScores.correct + 1 : subScores.correct,
                        total: subScores.total + 1
                    }
                };
            });
            setTimeout(() => {
                if (qIndex + 1 >= questions.length) {
                    setDone(true);
                } else {
                    setQIndex((q) => q + 1);
                    setAnswered(null);
                }
            }, 1000);
        };

        if (done) {
            return (
                <View style={{ flex: 1, backgroundColor: '#F7F8FC', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <Text style={{ fontSize: 48, marginBottom: 16 }}>🎉</Text>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: '#12183A', marginBottom: 8 }}>Quiz Complete!</Text>
                    <Text style={{ fontSize: 36, fontWeight: '800', color: '#3A86FF', marginBottom: 8 }}>{score}/{questions.length}</Text>
                    <Text style={{ fontSize: 14, color: '#5A6282', marginBottom: 32 }}>Spaced repetition will schedule your weak subjects more</Text>
                    <TouchableOpacity onPress={() => setScreen('dashboard')} style={{ backgroundColor: '#3A86FF', borderRadius: 14, padding: 16, alignItems: 'center', width: '100%' }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Back to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={{ flex: 1, backgroundColor: '#F7F8FC' }}>
                <View style={{ backgroundColor: '#F7962B', padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setScreen('dashboard')} style={{ marginRight: 12 }}>
                        <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>🧪 Quiz — {current.subject}</Text>
                </View>
                <View style={{ padding: 20 }}>
                    <View style={{ height: 6, backgroundColor: '#EEF0F8', borderRadius: 4, marginBottom: 24 }}>
                        <View style={{ height: '100%', width: ((qIndex + 1) / questions.length * 100) + '%', backgroundColor: '#F7962B', borderRadius: 4 }} />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#F7962B', marginBottom: 8 }}>QUESTION {qIndex + 1} OF {questions.length}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#12183A', marginBottom: 24, lineHeight: 26 }}>{current.question}</Text>
                    {current.options.map((opt, i) => {
                        const isCorrect = i === current.correct;
                        const isSelected = i === answered;
                        const bg = answered === null ? '#fff' : isCorrect ? '#16C79A' : isSelected ? '#EF4444' : '#fff';
                        const textCol = answered === null ? '#12183A' : isCorrect || isSelected ? '#fff' : '#12183A';
                        return (
                            <TouchableOpacity key={i} onPress={() => answer(i)} style={{ backgroundColor: bg, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: answered === null ? 'rgba(20,30,80,0.09)' : isCorrect ? '#16C79A' : isSelected ? '#EF4444' : 'rgba(20,30,80,0.09)' }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: textCol }}>{opt}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    }

    if (screen === 'parent') {
        return (
            <View style={{ flex: 1, backgroundColor: '#F7F8FC' }}>
                <View style={{ backgroundColor: '#16C79A', padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setScreen('dashboard')} style={{ marginRight: 12 }}>
                        <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>👨‍👩‍👧 Parent Dashboard</Text>
                </View>
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(20,30,80,0.09)' }}>
                        <Text style={{ fontSize: 13, color: '#5A6282', marginBottom: 4 }}>Student</Text>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#12183A' }}>{name || 'Student'}</Text>
                        <Text style={{ fontSize: 13, color: '#5A6282', marginTop: 2 }}>{grade}</Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#12183A', marginBottom: 12 }}>📊 Subject Performance</Text>
                    {selected.map((sub, i) => {
                        const mark = parseInt(marks[sub] || '0');
                        const col = mark >= 70 ? '#16C79A' : mark >= 50 ? '#F7962B' : '#EF4444';
                        const status = mark >= 70 ? 'On Track' : mark >= 50 ? 'Needs Attention' : 'At Risk';
                        return (
                            <View key={i} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(20,30,80,0.09)' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#12183A', flex: 1 }}>{sub}</Text>
                                    <View style={{ backgroundColor: col + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: col }}>{status}</Text>
                                    </View>
                                </View>
                                <View style={{ height: 5, backgroundColor: '#EEF0F8', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                                    <View style={{ height: '100%', width: mark + '%', backgroundColor: col, borderRadius: 4 }} />
                                </View>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: col }}>{mark}%</Text>
                            </View>
                        );
                    })}
                    <View style={{ backgroundColor: '#E3F9F3', borderRadius: 14, padding: 14, marginTop: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#16C79A', marginBottom: 4 }}>💡 Recommendation</Text>
                        <Text style={{ fontSize: 12, color: '#5A6282' }}>
                            {selected.filter(s => parseInt(marks[s] || '0') < 50).length > 0
                                ? 'Your child needs urgent support in ' + selected.filter(s => parseInt(marks[s] || '0') < 50).join(', ')
                                : selected.filter(s => parseInt(marks[s] || '0') < 70).length > 0
                                    ? 'Your child is developing well but needs focus on ' + selected.filter(s => parseInt(marks[s] || '0') < 70).join(', ')
                                    : 'Your child is performing well across all subjects!'}
                        </Text>
                    </View>
                </ScrollView>
            </View>
        );
    }

    if (screen === 'signin') {
        return (
            <View style={{ flex: 1, backgroundColor: '#F7F8FC' }}>
                <View style={{ backgroundColor: '#3A86FF', padding: 20, paddingTop: 60 }}>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>Welcome Back 👋</Text>
                    <Text style={{ fontSize: 14, color: '#ffffff90', marginTop: 4 }}>Sign in to continue learning</Text>
                </View>
                <View style={{ padding: 24 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#9BA3BE', letterSpacing: 1, marginBottom: 6, marginTop: 14 }}>EMAIL</Text>
                    <TextInput value={email} onChangeText={setEmail} placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none" style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1.5, borderColor: 'rgba(20,30,80,0.09)', marginBottom: 14 }} />
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#9BA3BE', letterSpacing: 1, marginBottom: 6 }}>PASSWORD</Text>
                    <TextInput value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1.5, borderColor: 'rgba(20,30,80,0.09)', marginBottom: 14 }} />
                    {authError ? <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600', marginBottom: 10, textAlign: 'center' }}>{authError}</Text> : null}
                    <TouchableOpacity onPress={async () => {
                        if (!email || !password) {
                            setAuthError('Please fill in all fields');
                            return;
                        }
                        setLoading(true);
                        const result = await signIn(email, password);
                        setLoading(false);
                        if (result.error) {
                            setAuthError(result.error);
                        } else {
                            setToken(result.token);
                            setUid(result.uid);
                            setScreen('dashboard');
                        }
                    }} style={{ backgroundColor: '#3A86FF', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>{loading ? 'Signing in...' : 'Sign In →'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setAuthError(''); setScreen('signup'); }} style={{ marginTop: 16, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#3A86FF', fontWeight: '700' }}>Don't have an account? Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (screen === 'pricing') {
        return (
            <View style={{ flex: 1, backgroundColor: '#F7F8FC' }}>
                <View style={{ backgroundColor: '#3A86FF', padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setScreen('dashboard')} style={{ marginRight: 12 }}>
                        <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>⭐ Subscribe to ScoreUp</Text>
                </View>
                <ScrollView contentContainerStyle={{ padding: 24 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, borderWidth: 2, borderColor: '#3A86FF', marginBottom: 20 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#3A86FF', marginBottom: 8 }}>SCOREUP PRO</Text>
                        <Text style={{ fontSize: 42, fontWeight: '800', color: '#12183A' }}>R200<Text style={{ fontSize: 16, color: '#5A6282' }}>/month</Text></Text>
                        <Text style={{ fontSize: 13, color: '#5A6282', marginBottom: 20 }}><Text style={{ fontSize: 13, color: '#5A6282', marginBottom: 8 }}>Normal price: R200/month</Text>
                            <View style={{ backgroundColor: '#16C79A18', borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: '#16C79A30' }}>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#16C79A', marginBottom: 4 }}>🎟️ With Influencer Promo Code:</Text>
                                <Text style={{ fontSize: 13, color: '#12183A', fontWeight: '700' }}>• Month 1: R160 (R40 off)</Text>
                                <Text style={{ fontSize: 13, color: '#12183A', fontWeight: '700' }}>• Month 2+: R185 (R15 off)</Text>
                            </View>
                        </Text>
                        <View style={{ gap: 10, marginBottom: 24 }}>
                            {['✅ Unlimited AI Tutor', '✅ Smart Study Planner', '✅ Unlimited Quizzes', '✅ Past Papers & Memos', '✅ Parent Dashboard', '✅ All 12 Grades CAPS'].map((feature, i) => (
                                <Text key={i} style={{ fontSize: 14, color: '#12183A', fontWeight: '600' }}>{feature}</Text>
                            ))}
                        </View>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#9BA3BE', letterSpacing: 1, marginBottom: 6 }}>PROMO CODE (OPTIONAL)</Text>
                        <TextInput value={promoCode} onChangeText={setPromoCode} placeholder="Enter influencer code" autoCapitalize="characters" style={{ backgroundColor: '#F7F8FC', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1.5, borderColor: 'rgba(20,30,80,0.09)', marginBottom: 14 }} />

                        <TouchableOpacity onPress={() => { const validCodes = ['THABO20', 'AMARA20', 'LEBO20']; if (promoCode && validCodes.includes(promoCode.toUpperCase())) { alert('Promo code applied! First month R160 then R185/month'); } else if (promoCode) { alert('Invalid promo code'); } else { alert('Proceeding with R200/month'); } }} style={{ backgroundColor: '#3A86FF', borderRadius: 14, padding: 16, alignItems: 'center' }}>

                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Subscribe Now — R200/month</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 12, color: '#9BA3BE', textAlign: 'center' }}>Cancel anytime. No hidden fees. Secure payment via PayFast.</Text>
                </ScrollView>
            </View>
        );
    }

    if (screen === 'aiquiz') {


        const generateQuiz = async () => {
            try {

                try {
                    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
                    setAiQ(parsed);
                } catch (parseError) {
                    setAiQ({ question: text, options: ['A', 'B', 'C', 'D'], correct: 0 });
                }
                setAiLoading(false);
            } catch (e) {
                setAiQ({ question: 'Error: ' + e.message, options: ['A', 'B', 'C', 'D'], correct: 0 });
                setAiLoading(false);
            }
        };
        if (aiLoading && !aiQ) generateQuiz();
        if (aiLoading) {
            return (
                <View style={{ flex: 1, backgroundColor: '#F7F8FC', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#12183A' }}>Generating quiz... 🤔</Text>
                </View>
            );
        }

        if (!aiQ) {
            return (
                <View style={{ flex: 1, backgroundColor: '#F7F8FC', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#12183A' }}>Could not generate quiz. Try again.</Text>
                    <TouchableOpacity onPress={() => setScreen('tutor')} style={{ marginTop: 16 }}>
                        <Text style={{ color: '#3A86FF', fontWeight: '700' }}>← Back to Tutor</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={{ flex: 1, backgroundColor: '#F7F8FC' }}>
                <View style={{ backgroundColor: '#F7962B', padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setScreen('tutor')} style={{ marginRight: 12 }}>
                        <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>🧪 Topic Quiz</Text>
                </View>
                <View style={{ padding: 24 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#F7962B', marginBottom: 8 }}>TOPIC: {quizTopic.toUpperCase()}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#12183A', marginBottom: 24, lineHeight: 26 }}>{aiQ.question}</Text>
                    {aiQ.options.map((opt, i) => {
                        const isCorrect = i === aiQ.correct;
                        const isSelected = i === aiAnswered;
                        const bg = aiAnswered === null ? '#fff' : isCorrect ? '#16C79A' : isSelected ? '#EF4444' : '#fff';
                        const textCol = aiAnswered === null ? '#12183A' : isCorrect || isSelected ? '#fff' : '#12183A';
                        return (
                            <TouchableOpacity key={i} onPress={() => { if (aiAnswered !== null) return; setAiAnswered(i); if (i === aiQ.correct) setAiScore(1); }} style={{ backgroundColor: bg, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: aiAnswered === null ? 'rgba(20,30,80,0.09)' : isCorrect ? '#16C79A' : isSelected ? '#EF4444' : 'rgba(20,30,80,0.09)' }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: textCol }}>{opt}</Text>
                            </TouchableOpacity>
                        );
                    })}
                    {aiAnswered !== null && (
                        <TouchableOpacity onPress={() => setScreen('tutor')} style={{ backgroundColor: '#3A86FF', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>{aiScore === 1 ? '✅ Correct! Back to Tutor' : '❌ Wrong. Back to Tutor'}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }

    if (screen === 'referral') {
        return (
            <View style={{ flex: 1, backgroundColor: '#F7F8FC' }}>
                <View style={{ backgroundColor: '#16C79A', padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setScreen('dashboard')} style={{ marginRight: 12 }}>
                        <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>🎁 My Referral Code</Text>
                </View>
                <ScrollView contentContainerStyle={{ padding: 24 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(20,30,80,0.09)' }}>
                        <Text style={{ fontSize: 13, color: '#5A6282', marginBottom: 8 }}>Your unique referral code</Text>
                        <Text style={{ fontSize: 36, fontWeight: '900', color: '#16C79A', letterSpacing: 4, marginBottom: 8 }}>{referralCode || 'LOADING'}</Text>
                        <TouchableOpacity onPress={() => Linking.openURL('whatsapp://send?text=Hey! Use my ScoreUp referral code ' + referralCode + ' to sign up and get R10 off your first month! Download at scoreup.co.za')} style={{ backgroundColor: '#25D366', borderRadius: 14, padding: 14, marginTop: 16, alignItems: 'center', width: '100%' }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>📲 Share via WhatsApp</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 12, color: '#5A6282', textAlign: 'center' }}>Share this code with friends. They get R10 off. You earn R10/month!</Text>
                    </View>
                    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(20,30,80,0.09)' }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#12183A', marginBottom: 4 }}>💰 My Earnings</Text>
                        <Text style={{ fontSize: 36, fontWeight: '900', color: '#16C79A' }}>R{referralEarnings}</Text>
                        <Text style={{ fontSize: 12, color: '#5A6282', marginTop: 4 }}>Total earned from referrals</Text>
                    </View>
                    <View style={{ backgroundColor: '#E3F9F3', borderRadius: 14, padding: 16 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#16C79A', marginBottom: 8 }}>📋 How it works</Text>
                        <Text style={{ fontSize: 12, color: '#5A6282', lineHeight: 20 }}>1. Share your code with friends{'\n'}2. Friend signs up and enters your code{'\n'}3. Friend pays R190 instead of R200{'\n'}4. You earn R10 every month they stay subscribed</Text>
                    </View>
                </ScrollView>
            </View>
        );
    }

    if (screen === 'settings') {
        return (
            <View style={{ flex: 1, backgroundColor: '#F7F8FC' }}>
                <View style={{ backgroundColor: '#12183A', padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setScreen('dashboard')} style={{ marginRight: 12 }}>
                        <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>⚙️ Settings</Text>
                </View>
                <ScrollView contentContainerStyle={{ padding: 24 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#12183A', marginBottom: 16 }}>Update Your Marks</Text>
                    {selected.map((sub, i) => (
                        <View key={i} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(20,30,80,0.09)' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#12183A', marginBottom: 8 }}>{sub}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => (
                                    <TouchableOpacity key={val} onPress={() => setMarks((prev) => ({ ...prev, [sub]: val.toString() }))} style={{ backgroundColor: marks[sub] === val.toString() ? '#3A86FF' : '#F0F2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: marks[sub] === val.toString() ? '#fff' : '#3A86FF' }}>{val}%</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ))}
                    <TouchableOpacity onPress={async () => {
                        await saveStudentData({ name, grade, selected, marks, role, uid, streak, referralCode, notifyHour, notifyMinute, isSubscribed });
                        await scheduleDailyReminder(notifyHour, notifyMinute);
                        setScreen('dashboard');
                    }} style={{ backgroundColor: '#3A86FF', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#12183A', marginBottom: 12, marginTop: 8 }}>🔔 Study Reminder</Text>
                        <Text style={{ fontSize: 13, color: '#5A6282', marginBottom: 12 }}>What time do you want to be reminded to study every day?</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#9BA3BE', marginBottom: 6 }}>HOUR</Text>
                                <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(20,30,80,0.09)', overflow: 'hidden' }}>
                                    {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((h) => (
                                        <TouchableOpacity key={h} onPress={() => setNotifyHour(h)} style={{ padding: 10, backgroundColor: notifyHour === h ? '#3A86FF' : '#fff' }}>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: notifyHour === h ? '#fff' : '#12183A', textAlign: 'center' }}>{h}:00</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#9BA3BE', marginBottom: 6 }}>MINUTE</Text>
                                <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(20,30,80,0.09)', overflow: 'hidden' }}>
                                    {[0, 15, 30, 45].map((m) => (
                                        <TouchableOpacity key={m} onPress={() => setNotifyMinute(m)} style={{ padding: 10, backgroundColor: notifyMinute === m ? '#3A86FF' : '#fff' }}>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: notifyMinute === m ? '#fff' : '#12183A', textAlign: 'center' }}>{m === 0 ? '00' : m}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Save Changes</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    if (screen === 'activate') {
        return (
            <View style={{ flex: 1, backgroundColor: '#F7F8FC' }}>
                <View style={{ backgroundColor: '#3A86FF', padding: 20, paddingTop: 60 }}>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>Activate ScoreUp ⚡</Text>
                    <Text style={{ fontSize: 14, color: '#ffffff90', marginTop: 4 }}>Enter your access code to unlock the full app</Text>
                </View>
                <View style={{ padding: 24 }}>
                    <Text style={{ fontSize: 13, color: '#5A6282', marginBottom: 24, lineHeight: 20 }}>After subscribing on our website you will receive a unique access code. Enter it below to activate your account.</Text>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#9BA3BE', letterSpacing: 1, marginBottom: 6 }}>ACCESS CODE</Text>
                    <TextInput value={accessCode} onChangeText={setAccessCode} placeholder="e.g. SCU-ELAM20-7K92" autoCapitalize="characters" style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1.5, borderColor: 'rgba(20,30,80,0.09)', marginBottom: 14, textAlign: 'center', letterSpacing: 2, fontWeight: '700' }} />
                    {authError ? <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600', marginBottom: 10, textAlign: 'center' }}>{authError}</Text> : null}
                    <TouchableOpacity onPress={() => {
                        if (VALID_CODES.includes(accessCode.trim().toUpperCase())) {
                            setIsSubscribed(true);
                            setAuthError('');
                            saveStudentData({ name, grade, selected, marks, role, uid, streak, referralCode, isSubscribed: true });
                            setScreen('dashboard');
                        } else {
                            setAuthError('Invalid access code. Please check and try again.');
                        }
                    }} style={{ backgroundColor: '#3A86FF', borderRadius: 14, padding: 16, alignItems: 'center' }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Activate Now →</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Linking.openURL('https://score-up-genius.lovable.app')} style={{ marginTop: 16, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#3A86FF', fontWeight: '700' }}>Don't have a code? Subscribe here →</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setScreen('dashboard')} style={{ marginTop: 10, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#9BA3BE', fontWeight: '600' }}>Skip for now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (screen === 'locked') {
        return (
            <View style={{ flex: 1, backgroundColor: '#F7F8FC', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#12183A', marginBottom: 8, textAlign: 'center' }}>Premium Feature</Text>
                <Text style={{ fontSize: 15, color: '#5A6282', textAlign: 'center', lineHeight: 24, marginBottom: 32 }}>Subscribe to ScoreUp to unlock the AI Tutor, Study Planner, Quizzes, Past Papers and more!</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://score-up-genius.lovable.app')} style={{ backgroundColor: '#3A86FF', borderRadius: 14, padding: 16, alignItems: 'center', width: '100%', marginBottom: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Subscribe — R200/month →</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setScreen('activate')} style={{ backgroundColor: '#FFF4E8', borderRadius: 14, padding: 16, alignItems: 'center', width: '100%', marginBottom: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#F7962B' }}>⚡ Already paid? Enter access code</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setScreen('dashboard')} style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 13, color: '#9BA3BE', fontWeight: '600' }}>← Back to Dashboard</Text>
                </TouchableOpacity>
            </View>
        );
    }


    return (
        <View style={{ flex: 1, backgroundColor: '#F7F8FC', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#12183A' }}>Coming Soon 🚀</Text>
        </View>
    );
}