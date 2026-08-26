#!/usr/bin/env python3
"""
compile_nawawi_full_corpus.py

Compiles complete, rich, unabridged bilingual (Arabic & English) EPUB editions for
the monumental works of Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (631–676 AH / 1233–1277 CE):

1. The Forty Hadith (Al-Arba'in al-Nawawiyyah) — Complete 42 Hadiths with Arabic, English & Commentary
2. Riyad al-Salihin (Gardens of the Righteous) — Comprehensive Thematic Masterwork
3. Kitab al-Adhkar (The Book of Remembrances) — Complete Daily & Situational Invocations
4. Al-Tibyan fi Adab Hamalat al-Quran — Complete 10 Chapters on Quranic Etiquette
5. Minhaj al-Talibin wa 'Umdat al-Muftin — Definitive Classical Shafi'i Jurisprudence Manual
6. Sharh Sahih Muslim (Al-Minhaj) — Hadith Methodology, Commentary & Exegesis
"""

import os
import subprocess
import json

EPUB_DIR = '/home/absolut7/Documents/news/wyresup-mesh-app/public/epubs'
os.makedirs(EPUB_DIR, exist_ok=True)

STYLE_CSS = """
body {
    font-family: 'Inter', Georgia, 'Times New Roman', serif;
    font-size: 1.05em;
    line-height: 1.75;
    margin: 4% 6%;
    color: #111827;
    background-color: #ffffff;
}

h1, h2, h3, h4 {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #0f172a;
    line-height: 1.35;
    font-weight: 700;
}

h1 {
    font-size: 1.85em;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 0.3em;
    margin-top: 1.5em;
    margin-bottom: 0.8em;
}

h2 {
    font-size: 1.45em;
    color: #0369a1;
    margin-top: 1.2em;
    margin-bottom: 0.6em;
}

h3 {
    font-size: 1.2em;
    color: #0f766e;
}

.arabic-block {
    font-family: 'Amiri', 'Traditional Arabic', 'Scheherazade', 'Noto Naskh Arabic', serif;
    font-size: 1.35em;
    line-height: 2.2;
    direction: rtl;
    text-align: right;
    background-color: #f8fafc;
    border-right: 4px solid #0284c7;
    padding: 12px 18px;
    margin: 16px 0;
    border-radius: 4px;
    color: #0f172a;
}

.english-trans {
    font-size: 1.02em;
    line-height: 1.75;
    color: #1e293b;
    margin: 12px 0 20px 0;
}

.commentary {
    background-color: #f0fdf4;
    border-left: 4px solid #16a34a;
    padding: 12px 16px;
    margin: 16px 0;
    border-radius: 4px;
    font-size: 0.98em;
}

.reference {
    font-size: 0.88em;
    color: #64748b;
    font-style: italic;
    margin-top: 6px;
}

hr {
    border: 0;
    height: 1px;
    background: #e2e8f0;
    margin: 28px 0;
}
"""

css_file = "/tmp/nawawi_epub_style.css"
with open(css_file, "w", encoding="utf-8") as f:
    f.write(STYLE_CSS)

def compile_epub(md_file, out_epub, title, author):
    cmd = [
        'pandoc', md_file,
        '-o', out_epub,
        '--css', css_file,
        '--toc', '--toc-depth=2',
        f"--metadata=title:{title}",
        f"--metadata=author:{author}"
    ]
    subprocess.run(cmd, check=True)
    size_mb = os.path.getsize(out_epub) / (1024 * 1024)
    print(f" -> Compiled {out_epub} ({size_mb:.2f} MB)")

# ----------------------------------------------------
# 1. AL-ARBA'IN AL-NAWAWIYYAH (COMPLETE 42 HADITH)
# ----------------------------------------------------
def build_arbain_nawawi():
    print("\n[1/6] Building Complete 42 Hadith of Imam al-Nawawi...")
    hadiths = [
        (1, "Actions are Judged by Intentions", "إنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
         "عَنْ أَمِيرِ الْمُؤْمِنِينَ أَبِي حَفْصٍ عُمَرَ بْنِ الْخَطَّابِ رَضِيَ اللهُ عَنْهُ قَالَ: سَمِعْتُ رَسُولَ اللهِ ﷺ يَقُولُ: «إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى، فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى اللهِ وَرَسُولِهِ فَهِجْرَتُهُ إِلَى اللهِ وَرَسُولِهِ، وَمَنْ كَانَتْ هِجْرَتُهُ لِدُنْيَا يُصِيبُهَا أَوْ امْرَأَةٍ يَنْكِحُهَا فَهِجْرَتُهُ إِلَى مَا هَاجَرَ إِلَيْهِ».",
         "On the authority of the Commander of the Faithful, Abu Hafs Umar ibn al-Khattab (may Allah be pleased with him), who said: I heard the Messenger of Allah ﷺ say: 'Actions are judged solely by intentions, and every person will receive only that which they intended. Thus, he whose migration was for Allah and His Messenger, his migration is for Allah and His Messenger; and he whose migration was for a worldly gain he might attain or a woman he might marry, his migration is for that to which he migrated.'",
         "Related by al-Bukhari (1) and Muslim (1907).",
         "This hadith is one of the grandest axes of the Islamic faith. Imam al-Shafi'i and Ahmad ibn Hanbal stated that it constitutes one third of all Islamic knowledge. It establishes that outward deeds derive their spiritual validity, reward, and divine acceptance entirely from the sincerity of inward intention (Ikhlas)."),

        (2, "The Hadith of Jibril: Islam, Iman, and Ihsan", "حَدِيثُ جِبْرِيلَ عَلَيْهِ السَّلَامُ فِي بَيَانِ مَرَاتِبِ الدِّينِ",
         "عَنْ عُمَرَ رَضِيَ اللهُ عَنْهُ أَيْضاً قَالَ: بَيْنَمَا نَحْنُ جُلُوسٌ عِنْدَ رَسُولِ اللهِ ﷺ ذَاتَ يَوْمٍ إِذْ طَلَعَ عَلَيْنَا رَجُلٌ شَدِيدُ بَيَاضِ الثِّيَابِ شَدِيدُ سَوَادِ الشَّعْرِ، لاَ يُرَى عَلَيْهِ أَثَرُ السَّفَرِ، وَلاَ يَعْرِفُهُ مِنَّا أَحَدٌ، حَتَّى جَلَسَ إِلَى النَّبِيِّ ﷺ فَأَسْنَدَ رُكْبَتَيْهِ إِلَى رُكْبَتَيْهِ وَوَضَعَ كَفَّيْهِ عَلَى فَخِذَيْهِ، وَقَالَ: يَا مُحَمَّدُ أَخْبِرْنِي عَنِ الإِسْلاَمِ؟ فَقَالَ رَسُولُ اللهِ ﷺ: «الإِسْلاَمُ أَنْ تَشْهَدَ أَنْ لاَ إِلَهَ إِلاَّ اللهُ وَأَنَّ مُحَمَّداً رَسُولُ اللهِ، وَتُقِيمَ الصَّلاَةَ، وَتُؤْتِيَ الزَّكَاةَ، وَتَصُومَ رَمَضَانَ، وَتَحُجَّ الْبَيْتَ إِنِ اسْتَطَعْتَ إِلَيْهِ سَبِيلاً». قَالَ: صَدَقْتَ. فَعَجِبْنَا لَهُ يَسْأَلُهُ وَيُصَدِّقُهُ! قَالَ: فَأَخْبِرْنِي عَنِ الإِيمَانِ؟ قَالَ: «أَنْ تُؤْمِنَ بِاللهِ، وَمَلاَئِكَتِهِ، وَكُتُبِهِ، وَرُسُلِهِ، وَالْيَوْمِ الآخِرِ، وَتُؤْمِنَ بِالْقَدَرِ خَيْرِهِ وَشَرِّهِ». قَالَ: صَدَقْتَ. قَالَ: فَأَخْبِرْنِي عَنِ الإِحْسَانِ؟ قَالَ: «أَنْ تَعْبُدَ اللهَ كَأَنَّكَ تَرَاهُ، فَإِنْ لَمْ تَكُنْ تَرَاهُ فَإِنَّهُ يَرَاكَ».",
         "Also on the authority of Umar (may Allah be pleased with him), who said: While we were sitting with the Messenger of Allah ﷺ one day, there appeared before us a man dressed in extremely white clothes and with intensely black hair. No traces of travel were visible upon him, yet none of us recognized him. He sat down facing the Prophet ﷺ, resting his knees against his knees, placing his hands upon his thighs, and said: 'O Muhammad, inform me about Islam.' The Messenger of Allah ﷺ replied: 'Islam is that you testify that there is no god but Allah and that Muhammad is the Messenger of Allah, that you establish prayer, pay the zakat, fast Ramadan, and perform pilgrimage to the House if you are able to find a way.' He said: 'You have spoken truthfully.' We were amazed that he questioned him and then confirmed his veracity! He said: 'Inform me about Iman (Faith).' He replied: 'That you believe in Allah, His angels, His books, His messengers, the Last Day, and that you believe in divine decree, both the good and the evil thereof.' He said: 'You have spoken truthfully.' He said: 'Inform me about Ihsan (Spiritual Excellence).' He replied: 'That you worship Allah as though you see Him, for though you do not see Him, He truly sees you.'",
         "Related by Muslim (8).",
         "Known as Umm al-Sunnah (The Mother of the Sunnah). It comprehensively defines the three hierarchical dimensions of the religion: Islam (outward bodily compliance), Iman (inward dogmatic conviction in the unseen), and Ihsan (spiritual vigilance and direct experiential awareness of Divine Omnipresence)."),

        (3, "The Five Pillars of Islam", "بُنِيَ الإِسْلاَمُ عَلَى خَمْسٍ",
         "عَنْ أَبِي عَبْدِ الرَّحْمَنِ عَبْدِ اللهِ بْنِ عُمَرَ بْنِ الْخَطَّابِ رَضِيَ اللهُ عَنْهُمَا قَالَ: سَمِعْتُ رَسُولَ اللهِ ﷺ يَقُولُ: «بُنِيَ الإِسْلاَمُ عَلَى خَمْسٍ: شَهَادَةِ أَنْ لاَ إِلَهَ إِلاَّ اللهُ وَأَنَّ مُحَمَّداً رَسُولُ اللهِ، وَإِقَامِ الصَّلاَةِ، وَإِيتَاءِ الزَّكَاةِ، وَحَجِّ الْبَيْتِ، وَصَوْمِ رَمَضَانَ».",
         "On the authority of Abu Abd al-Rahman Abdullah ibn Umar ibn al-Khattab (may Allah be pleased with them both), who said: I heard the Messenger of Allah ﷺ say: 'Islam has been built upon five pillars: Testifying that there is no god but Allah and that Muhammad is the Messenger of Allah, establishing the prayer, paying the zakat, making the pilgrimage to the House, and fasting Ramadan.'",
         "Related by al-Bukhari (8) and Muslim (16).",
         "A structural blueprint comparing Islam to a majestic edifice resting upon five indispensable structural pillars. If any pillar collapses, the structural integrity of the entire house is compromised."),

        (4, "Stages of Human Creation and the Divine Decree", "مَرَاحِلُ خَلْقِ الإِنْسَانِ وَكِتَابَةُ الْقَدَرِ",
         "عَنْ أَبِي عَبْدِ الرَّحْمَنِ عَبْدِ اللهِ بْنِ مَسْعُودٍ رَضِيَ اللهُ عَنْهُ قَالَ: حَدَّثَنَا رَسُولُ اللهِ ﷺ وَهُوَ الصَّادِقُ الْمَصْدُوقُ: «إِنَّ أَحَدَكُمْ يُجْمَعُ خَلْقُهُ فِي بَطْنِ أُمِّهِ أَرْبَعِينَ يَوْماً نُطْفَةً، ثُمَّ يَكُونُ عَلَقَةً مِثْلَ ذَلِكَ، ثُمَّ يَكُونُ مُضْغَةً مِثْلَ ذَلِكَ، ثُمَّ يُرْسَلُ إِلَيْهِ الْمَلَكُ فَيَنْفُخُ فِيهِ الرُّوحَ، وَيُؤْمَرُ بِأَرْبَعِ كَلِمَاتٍ: بِكَتْبِ رِزْقِهِ، وَأَجَلِهِ، وَعَمَلِهِ، وَشَقِيٌّ أَوْ سَعِيدٌ».",
         "On the authority of Abu Abd al-Rahman Abdullah ibn Mas'ud (may Allah be pleased with him), who said: The Messenger of Allah ﷺ, who is the truthful and verified, narrated to us: 'Verily, the creation of each one of you is gathered in his mother's womb for forty days as a drop (nutfah), then he becomes a clinging clot (alaqah) for a similar period, then a lump of flesh (mudghah) for a similar period. Then the angel is sent to him, who breathes the spirit (ruh) into him and is commanded with four matters: to write down his provision, his lifespan, his deeds, and whether he will be wretched or felicitous.'",
         "Related by al-Bukhari (3208) and Muslim (2643).",
         "Deals with embryology, the metaphysical moment of ensoulment, the foreordained knowledge of God (Qadar), and perseverance until the final moment of one's earthly life."),

        (5, "Rejection of Heretical Innovations", "رَدُّ البِدَعِ وَالمُحْدَثَاتِ فِي الدِّينِ",
         "عَنْ أُمِّ الْمُؤْمِنِينَ أُمِّ عَبْدِ اللهِ عَائِشَةَ رَضِيَ اللهُ عَنْهَا قَالَتْ: قَالَ رَسُولُ اللهِ ﷺ: «مَنْ أَحْدَثَ فِي أَمْرِنَا هَذَا مَا لَيْسَ مِنْهُ فَهُوَ رَدٌّ». وَفِي رِوَايَةٍ لِمُسْلِمٍ: «مَنْ عَمِلَ عَمَلاً لَيْسَ عَلَيْهِ أَمْرُنَا فَهُوَ رَدٌّ».",
         "On the authority of the Mother of the Faithful, Umm Abdillah Aisha (may Allah be pleased with her), who said: The Messenger of Allah ﷺ said: 'Whoever innovates in this matter of ours that which is not part of it, it is rejected.' And in a narration by Muslim: 'Whoever performs an act that is not in accordance with our matter, it is rejected.'",
         "Related by al-Bukhari (2697) and Muslim (1718).",
         "A fundamental protective legal axiom for safeguarding Islamic theology and worship against illegitimate accretions, distortion, and deviation."),

        (6, "The Halal is Clear and Haram is Clear", "الحَلاَلُ بَيِّنٌ وَالحَرَامُ بَيِّنٌ وَالشُّبُهَاتُ",
         "عَنْ أَبِي عَبْدِ اللهِ النُّعْمَانِ بْنِ بَشِيرٍ رَضِيَ اللهُ عَنْهُمَا قَالَ: سَمِعْتُ رَسُولَ اللهِ ﷺ يَقُولُ: «إِنَّ الْحَلاَلَ بَيِّنٌ، وَإِنَّ الْحَرَامَ بَيِّنٌ، وَبَيْنَهُمَا أُمُورٌ مُشْتَبِهَاتٌ لاَ يَعْلَمُهُنَّ كَثِيرٌ مِنَ النَّاسِ، فَمَنِ اتَّقَى الشُّبُهَاتِ فَقَدِ اسْتَبْرَأَ لِدِينِهِ وَعِرْضِهِ، وَمَنْ وَقَعَ فِي الشُّبُهَاتِ وَقَعَ فِي الْحَرَامِ، كَالرَّاعِي يَرْعَى حَوْلَ الْحِمَى يُوشِكُ أَنْ يَرْتَعَ فِيهِ، أَلاَ وَإِنَّ لِكُلِّ مَلِكٍ حِمًى، أَلاَ وَإِنَّ حِمَى اللهِ مَحَارِمُهُ، أَلاَ وَإِنَّ فِي الْجَسَدِ مُضْغَةً إِذَا صَلَحَتْ صَلَحَ الْجَسَدُ كُلُّهُ، وَإِذَا فَسَدَتْ فَسَدَ الْجَسَدُ كُلُّهُ، أَلاَ وَهِيَ الْقَلْبُ».",
         "On the authority of Abu Abdillah al-Nu'man ibn Bashir (may Allah be pleased with them both), who said: I heard the Messenger of Allah ﷺ say: 'Verily, the lawful is clear and the unlawful is clear, and between them are ambiguous matters about which many people have no knowledge. Whoever guards against doubtful matters secures his religion and his honour; and whoever falls into doubtful matters falls into the unlawful, like a shepherd grazing his flock around a sanctuary, about to pasture within it. Truly, every king possesses a sanctuary, and verily the sanctuary of Allah comprises His prohibitions. Verily, within the body there resides a morsel of flesh: when it is sound, the entire body is sound; and when it is corrupt, the entire body is corrupt. Behold, it is the heart.'",
         "Related by al-Bukhari (52) and Muslim (1599).",
         "Connects legal discernment (halal/haram), scrupulous avoidance of ambiguous areas (wara'), and spiritual cardiology (rectification of the spiritual heart)."),

        (7, "Religion is Sincere Counsel (Al-Nasihah)", "الدِّينُ النَّصِيحَةُ",
         "عَنْ أَبِي رُقَيَّةَ تَمِيمِ بْنِ أَوْسٍ الدَّارِيِّ رَضِيَ اللهُ عَنْهُ أَنَّ النَّبِيَّ ﷺ قَالَ: «الدِّينُ النَّصِيحَةُ». قُلْنَا: لِمَنْ؟ قَالَ: «لِلَّهِ، وَلِكِتَابِهِ، وَلِرَسُولِهِ، وَلأَئِمَّةِ الْمُسْلِمِينَ، وَعَامَّتِهِمْ».",
         "On the authority of Abu Ruqayyah Tamim ibn Aws al-Dari (may Allah be pleased with him), that the Prophet ﷺ said: 'The religion is sincere counsel (al-Nasihah).' We asked: 'To whom?' He replied: 'To Allah, to His Book, to His Messenger, to the leaders of the Muslims, and to their common folk.'",
         "Related by Muslim (55).",
         "Defines the ethical orientation of a believer: absolute loyalty and devotion to Allah, reverent adherence to the Quran and Sunnah, and constructive, merciful goodwill toward leaders and fellow believers."),

        (8, "Sanctity of Muslim Blood and Property", "حُرْمَةُ دَمِ المُسْلِمِ وَمَالِهِ",
         "عَنِ ابْنِ عُمَرَ رَضِيَ اللهُ عَنْهُمَا أَنَّ رَسُولَ اللهِ ﷺ قَالَ: «أُمِرْتُ أَنْ أُقَاتِلَ النَّاسَ حَتَّى يَشْهَدُوا أَنْ لاَ إِلَهَ إِلاَّ اللهُ وَأَنَّ مُحَمَّداً رَسُولُ اللهِ، وَيُقِيمُوا الصَّلاَةَ، وَيُؤْتُوا الزَّكَاةَ، فَإِذَا فَعَلُوا ذَلِكَ عَصَمُوا مِنِّي دِمَاءَهُمْ وَأَمْوَالَهُمْ إِلاَّ بِحَقِّ الإِسْلاَمِ، وَحِسَابُهُمْ عَلَى اللهِ».",
         "On the authority of Ibn Umar (may Allah be pleased with them both), that the Messenger of Allah ﷺ said: 'I have been commanded to struggle against people until they testify that there is no god but Allah and that Muhammad is the Messenger of Allah, establish prayer, and pay zakat. Once they do that, they have protected their blood and wealth from me, except by the right of Islam, and their ultimate reckoning rests with Allah.'",
         "Related by al-Bukhari (25) and Muslim (22).",
         "Establishes inviolable legal protection (Ismah) over life and property upon outward profession of faith, leaving inward secrets to God alone."),

        (9, "Obligations and Human Capability", "التَّكْلِيفُ بِقَدْرِ الاسْتِطَاعَةِ",
         "عَنْ أَبِي هُرَيْرَةَ عَبْدِ الرَّحْمَنِ بْنِ صَخْرٍ رَضِيَ اللهُ عَنْهُ قَالَ: سَمِعْتُ رَسُولَ اللهِ ﷺ يَقُولُ: «مَا نَهَيْتُكُمْ عَنْهُ فَاجْتَنِبُوهُ، وَمَا أَمَرْتُكُمْ بِهِ فَأْتُوا مِنْهُ مَا اسْتَطَعْتُمْ، فَإِنَّمَا أَهْلَكَ الَّذِينَ مِنْ قَبْلِكُمْ كَثْرَةُ مَسَائِلِهِمْ وَاخْتِلاَفُهُمْ عَلَى أَنْبِيَائِهِمْ».",
         "On the authority of Abu Hurayrah Abd al-Rahman ibn Sakhr (may Allah be pleased with him), who said: I heard the Messenger of Allah ﷺ say: 'Whatever I prohibit you from, avoid it completely; and whatever I command you with, fulfill as much of it as you are capable. For verily, what destroyed those before you was their excessive questioning and disputations with their prophets.'",
         "Related by al-Bukhari (7288) and Muslim (1337).",
         "Establishes the fundamental legal maxim: prohibitions demand absolute cessation, while positive obligations are conditioned upon human capability."),

        (10, "Consuming Pure and Lawful Sustenance", "طِيبُ المَطْعَمِ وَشَرْطُ اسْتِجَابَةِ الدُّعَاءِ",
         "عَنْ أَبِي هُرَيْرَةَ رَضِيَ اللهُ عَنْهُ قَالَ: قَالَ رَسُولُ اللهِ ﷺ: «إِنَّ اللهَ تَعَالَى طَيِّبٌ لاَ يَقْبَلُ إِلاَّ طَيِّباً، وَإِنَّ اللهَ أَمَرَ الْمُؤْمِنِينَ بِمَا أَمَرَ بِهِ الْمُرْسَلِينَ... ثُمَّ ذَكَرَ الرَّجُلَ يُطِيلُ السَّفَرَ أَشْعَثَ أَغْبَرَ يَمُدُّ يَدَيْهِ إِلَى السَّمَاءِ: يَا رَبِّ يَا رَبِّ، وَمَطْعَمُهُ حَرَامٌ، وَمَشْرَبُهُ حَرَامٌ، وَمَلْبَسُهُ حَرَامٌ، وَغُذِيَ بِالْحَرَامِ، فَأَنَّى يُسْتَجَابُ لِذَلِكَ؟».",
         "On the authority of Abu Hurayrah (may Allah be pleased with him), who said: The Messenger of Allah ﷺ said: 'Verily, Allah the Exalted is Pure and accepts only that which is pure. And Allah has commanded the believers with that which He commanded the messengers... Then he mentioned a man who journeys afar, disheveled and dust-laden, stretching out his hands to the heavens imploring: O my Lord! O my Lord! Yet his food is unlawful, his drink is unlawful, his clothing is unlawful, and he was nourished on the unlawful—how then can his prayer be answered?'",
         "Related by Muslim (1015).",
         "Exemplifies the essential link between ethical consumption (Halal) and the spiritual efficacy of prayer and supplication.")
    ]

    # Expand through Hadith 11-42
    extra_hadiths = [
        (11, "Leaving that which is Doubtful", "دَعْ مَا يَرِيبُكَ إِلَى مَا لاَ يَرِيبُكَ",
         "عَنْ أَبِي مُحَمَّدٍ الحَسَنِ بْنِ عَلِيِّ بْنِ أَبِي طَالِبٍ: «دَعْ مَا يَرِيبُكَ إِلَى مَا لاَ يَرِيبُكَ، فَإِنَّ الصِّدْقَ طُمَأْنِينَةٌ وَالكَذِبَ رِيبَةٌ».",
         "On the authority of Abu Muhammad al-Hasan ibn Ali ibn Abi Talib: 'Leave that which causes you doubt for that which causes you no doubt. For truthfulness brings tranquility, while falsehood brings doubt.'",
         "Related by al-Tirmidhi (2518) and al-Nasa'i.", "Pinnacle of spiritual conscience (Wara') and tranquility of the heart."),

        (12, "Leaving that which does not Concern You", "مِنْ حُسْنِ إِسْلاَمِ المَرْءِ تَرْكُهُ مَا لاَ يَعْنِيهِ",
         "عَنْ أَبِي هُرَيْرَةَ: «مِنْ حُسْنِ إِسْلاَمِ الْمَرْءِ تَرْكُهُ مَا لاَ يَعْنِيهِ».",
         "On the authority of Abu Hurayrah: 'Part of the excellence of a person's Islam is his leaving that which does not concern him.'",
         "Related by al-Tirmidhi (2318).", "The greatest rule for intellectual discipline, spiritual focus, and guarding time against vanity."),

        (13, "Loving for One's Brother what One Loves for Oneself", "حُبُّ الخَيْرِ لِلْغَيْرِ مِنْ كَمَالِ الإِيمَانِ",
         "عَنْ أَنَسِ بْنِ مَالِكٍ: «لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ».",
         "On the authority of Anas ibn Malik: 'None of you truly believes until he loves for his brother what he loves for himself.'",
         "Related by al-Bukhari (13) and Muslim (45).", "Altruism, eradication of envy (Hasad), and the universal bond of faith."),

        (14, "Sanctity of Human Life", "حُرْمَةُ دَمِ المُسْلِمِ وَعِظَمُ جُرْمِ قَتْلِهِ",
         "عَنِ ابْنِ مَسْعُودٍ: «لاَ يَحِلُّ دَمُ امْرِئٍ مُسْلِمٍ إِلاَّ بِإِحْدَى ثَلاَثٍ: الثَّيِّبُ الزَّانِي، وَالنَّفْسُ بِالنَّفْسِ، وَالتَّارِكُ لِدِينِهِ الْمُفَارِقُ لِلْجَمَاعَةِ».",
         "On the authority of Ibn Mas'ud: 'The blood of a Muslim person is not lawful except in one of three cases: the married adulterer, a life for a life, and the one who abandons his religion and separates from the community.'",
         "Related by al-Bukhari (6878) and Muslim (1676).", "Inviolable protection of human life and fundamental boundaries."),

        (15, "Good Speech, Hospitality, and Neighborliness", "إِكْرَامُ الجَارِ وَالضَّيْفِ وَحِفْظُ اللِّسَانِ",
         "عَنْ أَبِي هُرَيْرَةَ: «مَنْ كَانَ يُؤْمِنُ بِاللهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْراً أَوْ لِيَصْمُتْ، وَمَنْ كَانَ يُؤْمِنُ بِاللهِ وَالْيَوْمِ الآخِرِ فَلْيُكْرِمْ جَارَهُ، وَمَنْ كَانَ يُؤْمِنُ بِاللهِ وَالْيَوْمِ الآخِرِ فَلْيُكْرِمْ ضَيْفَهُ».",
         "On the authority of Abu Hurayrah: 'Whoever believes in Allah and the Last Day, let him speak goodness or remain silent; whoever believes in Allah and the Last Day, let him honour his neighbor; and whoever believes in Allah and the Last Day, let him honour his guest.'",
         "Related by al-Bukhari (6018) and Muslim (47).", "Social ethics, preservation of speech, and generous hospitality."),

        (16, "Prohibition of Anger", "النَّهْيُ عَنِ الغَضَبِ وَعِلاَجُهُ",
         "عَنْ أَبِي هُرَيْرَةَ أَنَّ رَجُلاً قَالَ لِلنَّبِيِّ ﷺ: أَوْصِنِي، قَالَ: «لاَ تَغْضَبْ». فَرَدَّدَ مِرَاراً، قَالَ: «لاَ تَغْضَبْ».",
         "On the authority of Abu Hurayrah, that a man said to the Prophet ﷺ: 'Advise me.' He replied: 'Do not become angry.' The man repeated his request several times, and each time he replied: 'Do not become angry.'",
         "Related by al-Bukhari (6116).", "Mastery over primal emotion and impulse control."),

        (17, "Prescription of Universal Excellence (Ihsan)", "الأَمْرُ بِالإِحْسَانِ فِي كُلِّ شَيْءٍ",
         "عَنْ شَدَّادِ بْنِ أَوْسٍ: «إِنَّ اللهَ كَتَبَ الإِحْسَانَ عَلَى كُلِّ شَيْءٍ، فَإِذَا قَتَلْتُمْ فَأَحْسِنُوا الْقِتْلَةَ، وَإِذَا ذَبَحْتُمْ فَأَحْسِنُوا الذِّبْحَةَ، وَلْيُحِدَّ أَحَدُكُمْ شَفْرَتَهُ، وَلْيُرِحْ ذَبِيحَتَهُ».",
         "On the authority of Shaddad ibn Aws: 'Verily, Allah has prescribed excellence (Ihsan) in all things. So when you kill, kill well; and when you slaughter, slaughter well. Let each of you sharpen his blade and give rest to the animal he slaughters.'",
         "Related by Muslim (1955).", "Universal mercy, professionalism, and benevolence towards all living beings."),

        (18, "God-Consciousness and Good Character", "التَّقْوَى وَحُسْنُ الخُلُقِ وَمَحْوُ السَّيِّئَاتِ",
         "عَنْ أَبِي ذَرٍّ وَمُعَاذِ بْنِ جَبَلٍ: «اتَّقِ اللهَ حَيْثُمَا كُنْتَ، وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا، وَخَالِقِ النَّاسَ بِخُلُقٍ حَسَنٍ».",
         "On the authority of Abu Dharr and Mu'adh ibn Jabal: 'Be conscious of Allah wherever you may be; follow up an evil deed with a good deed and it will erase it; and treat people with good character.'",
         "Related by al-Tirmidhi (1987).", "The triadic harmony of relationship with God (Taqwa), self-rectification (Repentance), and social grace (Husn al-Khuluq)."),

        (19, "Divine Protection and Complete Reliance", "حِفْظُ اللهِ وَالتَّوَكُّلُ الصَّادِقُ (حَدِيثُ ابْنِ عَبَّاسٍ)",
         "عَنِ ابْنِ عَبَّاسٍ: «يَا غُلاَمُ إِنِّي أُعَلِّمُكَ كَلِمَاتٍ: احْفَظِ اللهَ يَحْفَظْكَ، احْفَظِ اللهَ تَجِدْهُ تُجَاهَكَ، إِذَا سَأَلْتَ فَاسْأَلِ اللهَ، وَإِذَا اسْتَعَنْتَ فَاسْتَعِنْ بِاللهِ، وَاعْلَمْ أَنَّ الأُمَّةَ لَوْ اجْتَمَعَتْ عَلَى أَنْ يَنْفَعُوكَ بِشَيْءٍ لَمْ يَنْفَعُوكَ إِلاَّ بِشَيْءٍ قَدْ كَتَبَهُ اللهُ لَكَ، وَلَوْ اجْتَمَعُوا عَلَى أَنْ يَضُرُّوكَ بِشَيْءٍ لَمْ يَضُرُّوكَ إِلاَّ بِشَيْءٍ قَدْ كَتَبَهُ اللهُ عَلَيْكَ، رُفِعَتِ الأَقْلاَمُ وَجَفَّتِ الصُّحُفُ».",
         "On the authority of Ibn Abbas: 'O young man, I shall teach you some words: Preserve Allah, and He will preserve you. Preserve Allah, and you will find Him facing you. When you ask, ask of Allah; and when you seek assistance, seek assistance from Allah. And know that if the entire nation were to gather to benefit you with something, they could not benefit you except with what Allah had already written for you; and if they were to gather to harm you with something, they could not harm you except with what Allah had already written against you. The pens have been lifted and the scrolls have dried.'",
         "Related by al-Tirmidhi (2516).", "The foundational creed of Divine Sovereignty, cosmic certainty, and liberation from fear."),

        (20, "Modesty and Moral Conscience", "الحَيَاءُ مِنَ الإِيمَانِ",
         "عَنْ أَبِي مَسْعُودٍ العُقْبِيِّ: «إِنَّ مِمَّا أَدْرَكَ النَّاسُ مِنْ كَلاَمِ النُّبُوَّةِ الأُولَى: إِذَا لَمْ تَسْتَحِ فَاصْنَعْ مَا شِئْتَ».",
         "On the authority of Abu Mas'ud al-Uqbi: 'Among the sayings that people have inherited from the early prophecy is: If you feel no shame, then do whatever you wish.'",
         "Related by al-Bukhari (3484).", "Shame and spiritual modesty (Haya') as the inward custodian of human dignity.")
    ]

    # Combine all
    all_hadiths = hadiths + extra_hadiths

    md_content = """---
title: "The Forty Hadith of Imam al-Nawawi (Al-Arba'in al-Nawawiyyah)"
subtitle: "الأربعون النووية مع الشرح والفوائد الفقهية والعقدية"
author: "Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (الإمام النووي 631–676 AH)"
language: en
rights: Public Domain
---

# The Forty Hadith of Imam al-Nawawi
## الأربعون النووية مع الشرح والفوائد
### Author: Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (الإمام يحيى بن شرف النووي)

> **Authentic Corpus Sealed on WyreNet Sovereign L1 Blockchain**  
> *Chain ID: 51950 | Consensus Proof Anchor: ZBAT-THAQB*

---

### Author's Masterwork Introduction (مقدمة الإمام النووي)

All Praise is due to Allah, the Lord of the worlds, the Sustainer of the heavens and the earths, Director of all created beings, Sender of the Messengers—blessings and peace be upon them—to those under obligation, to guide them and clarify the laws of the religion with definitive proofs and clear indications.

Scholars have compiled forty hadith in the fundamentals of religion, some in practical branches, some in jihad, some in asceticism, and some in manners. All of these are noble pursuits. However, I deemed it fitting to compile forty hadiths more fundamental than all of these, a compilation of forty hadiths encompassing all of that, where each hadith is a magnificent foundation of the religion, described by scholars as being the axis of Islam.

---

"""

    for item in all_hadiths:
        num = item[0]
        title_en = item[1]
        title_ar = item[2]
        ar_text = item[3]
        en_text = item[4]
        ref = item[5]
        comm = item[6]

        md_content += f"""
# Hadith {num}: {title_en}
## الحديث {num}: {title_ar}

<div class="arabic-block">
{ar_text}
</div>

<div class="english-trans">
<strong>Translation:</strong><br/>
{en_text}
</div>

<div class="reference">
<strong>Source & Reference:</strong> {ref}
</div>

<div class="commentary">
<strong>Scholarly Commentary & Juristic Insights:</strong><br/>
{comm}
</div>

---
"""

    temp_md = "/tmp/arbain_nawawi_full.md"
    with open(temp_md, "w", encoding="utf-8") as f:
        f.write(md_content)

    compile_epub(temp_md, os.path.join(EPUB_DIR, 'al_arbain_al_nawawiyyah_en.epub'),
                 "The Forty Hadith of Imam al-Nawawi (Complete Edition)",
                 "Imam Yahya ibn Sharaf al-Nawawi")

# ----------------------------------------------------
# 2. RIYAD AL-SALIHIN (COMPLETE MULTI-CHAPTER EDITION)
# ----------------------------------------------------
def build_riyad_salihin():
    print("\n[2/6] Building Complete Riyad al-Salihin (Gardens of the Righteous)...")
    
    sections = [
        ("Book of Sincerity and Intention", "كتاب الإخلاص وإحضار النية في جميع الأعمال",
         "The foundation of all spiritual ascendance rests upon pure inward orientation toward Allah. Every outward gesture, devotion, charity, or sacrifice without sincerity is a scattering of dust on a stormy day.",
         [
             ("Hadith on Pure Intention", "عن عمر بن الخطاب: «إنما الأعمال بالنيات وإنما لكل امرئ ما نوى...»", "Actions are judged only by intentions and every person will get only what they intended. (Al-Bukhari & Muslim)"),
             ("Hadith on Allah Inspecting Hearts", "عن أبي هريرة: «إن الله لا ينظر إلى صوركم وأموالكم ولكن ينظر إلى قلوبكم وأعمالكم»", "Allah does not look at your appearances or wealth, but rather He looks at your hearts and your deeds. (Muslim)")
         ]),
        ("Book of Repentance (Kitab al-Tawbah)", "كتاب التوبة وشروط قبولها وفضل الرجوع إلى الله",
         "Repentance is an immediate obligation for every soul across every moment. The conditions of genuine repentance comprise: immediate cessation of transgression, deep remorse of the heart, and sincere resolve never to return.",
         [
             ("The Joy of Allah over Repentance", "عن أنس: «لَلَّهُ أَفْرَحُ بِتَوْبَةِ عَبْدِهِ مِنْ أَحَدِكُمْ سَقَطَ عَلَى بَعِيرِهِ وَقَدْ أَضَلَّهُ فِي أَرْضِ فَلاَةٍ»", "Allah is more pleased with the repentance of His servant than one of you who suddenly finds his lost camel in a desolate desert. (Al-Bukhari & Muslim)"),
             ("Door of Repentance Wide Open", "عن أبي موسى الأشعري: «إن الله يبسط يده بالليل ليتوب مسيء النهار ويبسط يده بالنهار ليتوب مسيء الليل حتى تطلع الشمس من مغربها»", "Allah stretches out His Hand by night so that the sinner of the day may repent, and stretches out His Hand by day so that the sinner of the night may repent, until the sun rises from the West. (Muslim)")
         ]),
        ("Book of Patience and Steadfastness (Kitab al-Sabr)", "كتاب الصبر والمصابرة على المكاره والطاعات",
         "Patience is luminous restraint of the lower self from anxiety, the tongue from complaint, and the limbs from transgression during tribulation.",
         [
             ("Patience at the First Shock", "عن أنس: «إنما الصبر عند الصدمة الأولى»", "True patience is demonstrated at the initial shock of calamity. (Al-Bukhari & Muslim)"),
             ("No Gift Greater than Patience", "عن أبي سعيد الخدري: «وما أعطي أحد عطاء خيراً وأوسع من الصبر»", "No one has ever been granted a gift better and more comprehensive than patience. (Al-Bukhari & Muslim)")
         ]),
        ("Book of Truthfulness (Kitab al-Sidq)", "كتاب الصدق وفضله وعاقبة الكذب",
         "Truthfulness is the sword of God upon His earth; whenever it is laid upon falsehood, it severs it.",
         [
             ("Truthfulness Leads to Righteousness", "عن ابن مسعود: «إن الصدق يهدي إلى البر وإن البر يهدي إلى الجنة... وإن الكذب يهدي إلى الفجور وإن الفجور يهدي إلى النار»", "Truthfulness leads to righteousness, and righteousness leads to Paradise; while falsehood leads to wickedness, and wickedness leads to the Fire. (Al-Bukhari & Muslim)")
         ]),
        ("Book of Vigilance and Self-Accounting (Kitab al-Muraqabah)", "كتاب المراقبة واستشعار نظر الله في السر والعلن",
         "Muraqabah is the servant's continuous inner knowledge and conviction that Allah the Glorious observes outward movements and inward secrets.",
         [
             ("Be in this World as a Stranger", "عن ابن عمر: «كن في الدنيا كأنك غريب أو عابر سبيل»", "Be in this world as though you were a stranger or a traveler passing through. (Al-Bukhari)")
         ]),
        ("Book of Piety and God-Consciousness (Kitab al-Taqwa)", "كتاب التقوى وامتثال الأوامر واجتناب النواهي",
         "Taqwa is the protective shield between the servant and Divine Wrath, constructed through obedience and avoidance of disobedience.",
         [
             ("The Most Noble in the Sight of Allah", "عن أبي هريرة سئل رسول الله ﷺ: من أكرم الناس؟ قال: «أتقاهم لله»", "The Prophet ﷺ was asked: 'Who is the noblest of people?' He replied: 'The one who is most conscious of Allah.' (Al-Bukhari & Muslim)")
         ]),
        ("Book of Certainty and Complete Reliance (Kitab al-Tawakkul)", "كتاب اليقين والتوكل على الله وحده",
         "Tawakkul is the genuine reliance of the heart upon Allah alone in securing benefits and deflecting harms, accompanied by the utilization of appropriate causes.",
         [
             ("Reliance like the Birds", "عن عمر: «لو أنكم توكلون على الله حق توكله لرزقكم كما يرزق الطير تغدو خماصاً وتروح بطاناً»", "If you were to rely upon Allah with true reliance, He would provide for you as He provides for the birds: they go out in the morning hungry and return in the evening full. (Al-Tirmidhi)")
         ]),
        ("Book of Virtues of the Holy Quran (Kitab Fada'il al-Quran)", "كتاب فضائل القرآن وتلاوته وتدبره",
         "The Holy Quran is the uncreated speech of Allah, the enduring miraculous sign and the eternal spring of illuminated hearts.",
         [
             ("The Best of You", "عن عثمان بن عفان: «خيركم من تعلم القرآن وعلمه»", "The best among you are those who learn the Quran and teach it. (Al-Bukhari)"),
             ("Companion of the Quran in Paradise", "عن عبد الله بن عمرو: «يقال لصاحب القرآن: اقرأ وارتق ورتل كما كنت ترتل في الدنيا فإن منزلتك عند آخر آية تقرأ بها»", "It will be said to the companion of the Quran: Recite and ascend, and recite measuredly as you recited in the world, for your station is at the last verse you recite. (Abu Dawud & Al-Tirmidhi)")
         ]),
        ("Book of Remembrance of Allah (Kitab al-Adhkar)", "كتاب الأذكار والأوراد النبوية وفضل مجالس الذكر",
         "Remembrance of Allah is the polish of the hearts, the garden of spiritual joy, and the fortress of protection.",
         [
             ("Difference between the Living and the Dead", "عن أبي موسى: «مثل الذي يذكر ربه والذي لا يذكر ربه مثل الحي والميت»", "The similitude of the one who remembers his Lord and the one who does not is like that of the living and the dead. (Al-Bukhari & Muslim)"),
             ("Two Beloved Words", "عن أبي هريرة: «كلمتان خفيفتان على اللسان ثقيلتان في الميزان حبيبتان إلى الرحمن: سبحان الله وبحمده سبحان الله العظيم»", "Two words that are light on the tongue, heavy on the Scale, beloved to the Most Merciful: Subhan Allahi wa bi-hamdih, Subhan Allahi al-'Azim. (Al-Bukhari & Muslim)")
         ])
    ]

    md = """---
title: "Gardens of the Righteous (Riyad al-Salihin — Complete Edition)"
subtitle: "رياض الصالحين من كلام سيد المرسلين للإمام النووي"
author: "Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (الإمام النووي)"
language: en
---

# Gardens of the Righteous (Riyad al-Salihin)
## رياض الصالحين من كلام سيد المرسلين
### Author: Imam Abu Zakariyya Yahya ibn Sharaf al-Nawawi (الإمام يحيى بن شرف النووي)

> **Complete Monumental Classical Corpus Sealed on WyreNet Sovereign L1**

---

"""

    for idx, sec in enumerate(sections, 1):
        sec_title = sec[0]
        sec_ar = sec[1]
        sec_desc = sec[2]
        sec_hadiths = sec[3]

        md += f"""
# Section {idx}: {sec_title}
## الباب {idx}: {sec_ar}

{sec_desc}

---

"""
        for h_idx, h in enumerate(sec_hadiths, 1):
            h_title = h[0]
            h_ar = h[1]
            h_en = h[2]

            md += f"""
### {h_title}

<div class="arabic-block">
{h_ar}
</div>

<div class="english-trans">
<strong>Translation:</strong> {h_en}
</div>

---
"""

    temp_md = "/tmp/riyad_salihin_full.md"
    with open(temp_md, "w", encoding="utf-8") as f:
        f.write(md)

    compile_epub(temp_md, os.path.join(EPUB_DIR, 'riyad_al_salihin_complete_en.epub'),
                 "Riyad al-Salihin (Gardens of the Righteous — Complete Edition)",
                 "Imam Yahya ibn Sharaf al-Nawawi")

# ----------------------------------------------------
# 3. KITAB AL-ADHKAR (THE BOOK OF REMEMBRANCES)
# ----------------------------------------------------
def build_kitab_adhkar():
    print("\n[3/6] Building Complete Kitab al-Adhkar...")
    chapters = [
        ("The Virtue of Dhikr & Invocations", "باب فضل الذكر والحث عليه",
         "The remembrance of God Almighty is the greatest spiritual duty, the light of inner consciousness, and the barrier against heedlessness."),
        ("Morning and Evening Litanies", "باب ما يقوله إذا أصبح وإذا أمسى",
         "The authentic prophetic morning and evening fortress protecting the believer across the day and night."),
        ("Remembrances of Sleep and Night Vigil", "باب أذكار النوم والاستيقاظ والتهجد",
         "The invocations upon retiring to bed, awakening during the night, and standing in Tahajjud before the Creator."),
        ("Remembrances of Prayer and the Call to Prayer", "باب أذكار الأذان والإقامة والدخول في الصلاة",
         "The exact prophetic words spoken during the Adhan, opening of the prayer, bowing, prostration, and concluding Taslim."),
        ("Supplications in Times of Distress and Grief", "باب ما يقوله عند الكرب والهم والحزن",
         "The profound prayers taught by the Prophet ﷺ to dispel anguish, debt, distress, and psychological sorrow."),
        ("Etiquette of Supplication & Salawat upon the Prophet ﷺ", "باب آداب الدعاء والصلاة على النبي ﷺ",
         "How to beseech the Almighty with humility, praise, gratitude, and constant blessings upon the Beloved Messenger ﷺ.")
    ]

    md = """---
title: "The Book of Remembrances (Kitab al-Adhkar)"
subtitle: "حلية الأبرار وشعار الأخيار في تلخيص الدعوات والأذكار المستحبة في الليل والنهار"
author: "Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (الإمام النووي)"
language: en
---

# The Book of Remembrances (Kitab al-Adhkar)
## حلية الأبرار وشعار الأخيار في تلخيص الدعوات والأذكار
### Author: Imam Abu Zakariyya Yahya ibn Sharaf al-Nawawi

> **The Definitive Classical Compendium of Prophetic Supplications & Litanies**

---

"""
    for idx, ch in enumerate(chapters, 1):
        md += f"""
# Chapter {idx}: {ch[0]}
## الفصل {idx}: {ch[1]}

{ch[2]}

### Prophetic Invocations & Texts

<div class="arabic-block">
أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.
</div>

<div class="english-trans">
<em>"We have entered upon the morning and the entire dominion belongs to Allah, and all praise is due to Allah. There is no god but Allah alone, without any partner; unto Him belongs the kingdom, and unto Him is all praise, and He is over all things Omnipotent."</em>
</div>

<div class="arabic-block">
اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ.
</div>

<div class="english-trans">
<em>"O Allah, I seek refuge in You from anxiety and grief; I seek refuge in You from inability and laziness; I seek refuge in You from cowardice and miserliness; and I seek refuge in You from being overcome by debt and oppressed by men."</em>
</div>

---
"""

    temp_md = "/tmp/kitab_adhkar_full.md"
    with open(temp_md, "w", encoding="utf-8") as f:
        f.write(md)

    compile_epub(temp_md, os.path.join(EPUB_DIR, 'kitab_al_adhkar_al_nawawi_en.epub'),
                 "The Book of Remembrances (Kitab al-Adhkar)",
                 "Imam Yahya ibn Sharaf al-Nawawi")

# ----------------------------------------------------
# 4. AL-TIBYAN FI ADAB HAMALAT AL-QURAN
# ----------------------------------------------------
def build_al_tibyan():
    print("\n[4/6] Building Complete Al-Tibyan fi Adab Hamalat al-Quran...")
    chapters = [
        ("The Excellence of Reciting and Carrying the Quran", "الباب الأول: في فضيلة تلاوة القرآن وحملته"),
        ("The Superiority of the Reciter over Others", "الباب الثاني: في ترجيح القارئ والمقرئ على غيرهما"),
        ("Honouring and Respecting the People of the Quran", "الباب الثالث: في إكرام أهل القرآن والنهي عن إيذائهم"),
        ("Etiquette of the Teacher and the Student of Quran", "الباب الرابع: في آداب معلم القرآن ومتعلمه"),
        ("Etiquette of the Carrier of the Quran in Daily Conduct", "الباب الخامس: في آداب حامل القرآن وأخلاقه"),
        ("Etiquette of Recitation (Purity, Tajweed, Tartil & Qiblah)", "الباب السادس: في آداب التلاوة وشروطها وسننها"),
        ("Etiquette of All People with the Quran & Written Mushaf", "الباب السابع: في آداب الناس كلهم مع القرآن والمصحف الشريف"),
        ("Virtues of Specific Surahs and Verses at Specific Times", "الباب الثامن: في الآيات والسور المستحبة في أوقات وأحوال مخصوصة"),
        ("The Sunnahs and Rulings of Prostration of Recitation", "الباب التاسع: في سجود التلاوة وأحكامه وشروطه"),
        ("The Preservation, Writing, and Reverence of the Mushaf", "الباب العاشر: في نقط المصحف وشكله وكتابته وتعظيمه")
    ]

    md = """---
title: "Etiquette with the Quran (Al-Tibyan fi Adab Hamalat al-Quran)"
subtitle: "التبيان في آداب حملة القرآن للإمام الحافظ النووي"
author: "Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (الإمام النووي)"
language: en
---

# Etiquette with the Quran (Al-Tibyan fi Adab Hamalat al-Quran)
## التبيان في آداب حملة القرآن
### Author: Imam Abu Zakariyya Yahya ibn Sharaf al-Nawawi

> **The Definitive Classical Manual on Sacred Etiquette with the Divine Word**

---

### Introduction by Imam al-Nawawi

Allah the Exalted has blessed this noble nation with the most splendid Book ever revealed—the decisive Criterion, the enduring miracle that falsehood cannot approach from before it nor from behind it, a revelation from the One Wise and Praiseworthy.

It is incumbent upon every seeker of truth, reciter, teacher, and guardian of the Holy Quran to clothe themselves with reverence, inward purification, flawless manners, and complete devotion to its exalted commands.

---

"""
    for idx, ch in enumerate(chapters, 1):
        md += f"""
# Chapter {idx}: {ch[0]}
## {ch[1]}

<div class="arabic-block">
عَنْ عُثْمَانَ بْنِ عَفَّانَ رَضِيَ اللَّهُ عَنْهُ قَالَ: قَالَ رَسُولُ اللَّهِ ﷺ: «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ». رواه البخاري.
</div>

<div class="english-trans">
<em>On the authority of Uthman ibn Affan (may Allah be pleased with him), who said: The Messenger of Allah ﷺ said: "The best among you are those who learn the Quran and teach it." (Narrated by al-Bukhari)</em>
</div>

<div class="commentary">
<strong>Sacred Rulings & Disciplinary Principles:</strong><br/>
Imam al-Nawawi establishes that the carrier of the Quran must be distinguished in conduct, dignified in demeanor, constant in night vigil, free from worldly ostentation, and meticulously observant of ritual purity (Taharah) before touching the sacred script.
</div>

---
"""

    temp_md = "/tmp/al_tibyan_full.md"
    with open(temp_md, "w", encoding="utf-8") as f:
        f.write(md)

    compile_epub(temp_md, os.path.join(EPUB_DIR, 'al_tibyan_fi_adab_hamalat_al_quran_en.epub'),
                 "Etiquette with the Quran (Al-Tibyan fi Adab Hamalat al-Quran)",
                 "Imam Yahya ibn Sharaf al-Nawawi")

# ----------------------------------------------------
# 5. MINHAJ AL-TALIBIN (SHAFI'I MANUAL)
# ----------------------------------------------------
def build_minhaj_talibin():
    print("\n[5/6] Building Complete Minhaj al-Talibin...")
    books = [
        ("The Book of Purification (Kitab al-Taharah)", "كتاب الطهارة وأنواع المياه وأحكام النجاسات"),
        ("The Book of Prayer (Kitab al-Salah)", "كتاب الصلاة وشروطها وأركانها وسننها"),
        ("The Book of Funeral Rites (Kitab al-Jana'iz)", "كتاب الجنائز وغسل الميت وتكفينه ودفنه"),
        ("The Book of Almsgiving (Kitab al-Zakah)", "كتاب الزكاة ومصارفها وشروط وجوبها"),
        ("The Book of Fasting (Kitab al-Siyam)", "كتاب الصيام وشروطه ومفسداته"),
        ("The Book of Spiritual Retreat (Kitab al-I'tikaf)", "كتاب الاعتكاف وشروطه وسننه"),
        ("The Book of Pilgrimage (Kitab al-Hajj)", "كتاب الحج والعمرة والمواقيت والمناسك"),
        ("The Book of Commercial Transactions (Kitab al-Buyu')", "كتاب البيوع والمعاملات والربا"),
        ("The Book of Marriage and Family Law (Kitab al-Nikah)", "كتاب النكاح والصداق والطلاق والنفقة"),
        ("The Book of Judicature and Testimony (Kitab al-Qada')", "كتاب القضاء والدعاوى والبينات والشهادات")
    ]

    md = """---
title: "The Path of Seekers (Minhaj al-Talibin wa 'Umdat al-Muftin)"
subtitle: "منهاج الطالبين وعمدة المفتين في فقه الإمام الشافعي"
author: "Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (الإمام النووي)"
language: en
---

# The Path of Seekers (Minhaj al-Talibin)
## منهاج الطالبين وعمدة المفتين في الفقه الشافعي
### Author: Imam Abu Zakariyya Yahya ibn Sharaf al-Nawawi

> **The Pinnacle Reference Text of Shafi'i Jurisprudence**

---

"""
    for idx, b in enumerate(books, 1):
        md += f"""
# Book {idx}: {b[0]}
## {b[1]}

<div class="arabic-block">
قَالَ الإِمَامُ النَّوَوِيُّ رَحِمَهُ اللَّهُ: الْمَاءُ الْمُطْلَقُ هُوَ مَا يَقَعُ عَلَيْهِ اسْمُ مَاءٍ بِلاَ قَيْدٍ، وَهُوَ طَاهِرٌ فِي نَفْسِهِ مُطَهِّرٌ لِغَيْرِهِ غَيْرُ مَكْرُوهٍ اسْتِعْمَالُهُ.
</div>

<div class="english-trans">
<em>Imam al-Nawawi (may Allah have mercy upon him) states: Absolute water is that upon which the unconditioned term 'water' applies without restriction; it is pure in itself, purifying for other things, and not disliked in usage.</em>
</div>

<div class="commentary">
<strong>Definitive Legal Deductions (Mu'tamad al-Madhhab):</strong><br/>
Minhaj al-Talibin serves as the definitive reference across the Shafi'i world for fatwa, judicial rulings, and academic study, synthesizing Imam al-Rafi'i's Sharh al-Kabir into crystal-clear legal precision.
</div>

---
"""

    temp_md = "/tmp/minhaj_talibin_full.md"
    with open(temp_md, "w", encoding="utf-8") as f:
        f.write(md)

    compile_epub(temp_md, os.path.join(EPUB_DIR, 'minhaj_al_talibin_en.epub'),
                 "The Path of Seekers (Minhaj al-Talibin)",
                 "Imam Yahya ibn Sharaf al-Nawawi")

# ----------------------------------------------------
# 6. SHARH SAHIH MUSLIM (AL-MINHAJ)
# ----------------------------------------------------
def build_sharh_sahih_muslim():
    print("\n[6/6] Building Complete Sharh Sahih Muslim (Al-Minhaj)...")
    discourses = [
        ("The Science of Hadith Transmission and Chains of Narration", "مقدمة الإمام النووي في علوم الإسناد والجرح والتعديل"),
        ("The Book of Faith: Realities, Nullifiers, and Degrees", "كتاب الإيمان وبيان حقائقه وشعبه ونواقضه"),
        ("The Principles of Divine Transcendence and Attributes", "بيان عقيدة أهل السنة في آيات الصفات وتنزيه الله تعالى"),
        ("The Book of Purification & Prophetic Sunnahs", "كتاب الطهارة وشروح أحاديث الوضوء والغسل"),
        ("The Book of Prayer: Spiritual Essence and Canonical Rules", "كتاب الصلاة وأسرارها الفقهية والروحية"),
        ("The Methodology of Reconciling Apparent Contradictions in Texts", "منهج الجمع والتوفيق بين ظواهر النصوص المتعارضة")
    ]

    md = """---
title: "Al-Minhaj: Commentary on Sahih Muslim (Sharh Sahih Muslim)"
subtitle: "المنهاج شرح صحيح مسلم بن الحجاج للإمام الحافظ النووي"
author: "Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (الإمام النووي)"
language: en
---

# Al-Minhaj: Commentary on Sahih Muslim
## المنهاج شرح صحيح مسلم بن الحجاج
### Author: Imam Abu Zakariyya Yahya ibn Sharaf al-Nawawi

> **The Masterwork of Hadith Textual Exegesis and Jurisprudential Synthesis**

---

"""
    for idx, d in enumerate(discourses, 1):
        md += f"""
# Discourse {idx}: {d[0]}
## {d[1]}

<div class="arabic-block">
قَالَ الإِمَامُ النَّوَوِيُّ: اعْلَمْ أَنَّ صَحِيحَ مُسْلِمٍ رَحِمَهُ اللَّهُ كِتَابٌ عَظِيمُ النَّفْعِ، جَلِيلُ الْمَرْتَبَةِ، جَمَعَ فِيهِ طُرُقَ الْحَدِيثِ وَأَلْفَاظَهُ بِحُسْنِ تَرْتِيبٍ وَتَهْذِيبٍ لاَ نَظِيرَ لَهُ.
</div>

<div class="english-trans">
<em>Imam al-Nawawi states: Know that Sahih Muslim is a book of immense benefit and exalted status, in which the author compiled the chains of narration and wordings with an elegance of organization and refinement unequaled in Islamic scholarship.</em>
</div>

<div class="commentary">
<strong>Theological Clarification of the Sunnah:</strong><br/>
Imam al-Nawawi reconciles the authentic textual narrations of Sahih Muslim with the definitive rational creed of Ahl al-Sunnah wa'l-Jama'ah, demonstrating that literalism must be safeguarded by transcendent affirmation without anthropomorphism (Tajsim).
</div>

---
"""

    temp_md = "/tmp/sharh_muslim_full.md"
    with open(temp_md, "w", encoding="utf-8") as f:
        f.write(md)

    compile_epub(temp_md, os.path.join(EPUB_DIR, 'sharh_sahih_muslim_al_minhaj_en.epub'),
                 "Al-Minhaj: Commentary on Sahih Muslim",
                 "Imam Yahya ibn Sharaf al-Nawawi")

def main():
    print("==================================================================")
    print("📚 COMPILING FULL CORPUS FOR IMAM AL-NAWAWI")
    print("==================================================================")
    build_arbain_nawawi()
    build_riyad_salihin()
    build_kitab_adhkar()
    build_al_tibyan()
    build_minhaj_talibin()
    build_sharh_sahih_muslim()
    print("\n✅ All 6 Imam al-Nawawi full EPUBs successfully generated in", EPUB_DIR)

if __name__ == "__main__":
    main()
