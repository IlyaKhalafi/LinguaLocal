"""Generate the original starter pack for the bundled local listening sample."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

words = [
    ("curious", "/ˈkjʊəriəs/", "adjective", "Eager to know or learn something.", "Stay curious and ask one more question.", "A2", ["inquisitive", "interested"]),
    ("journey", "/ˈdʒɜːrni/", "noun", "An act of travelling from one place to another.", "Our journey began at the train station.", "A2", ["trip", "voyage"]),
    ("discover", "/dɪˈskʌvər/", "verb", "To find something for the first time.", "We discovered a quiet cafe near the school.", "A2", ["find", "uncover"]),
    ("resilient", "/rɪˈzɪliənt/", "adjective", "Able to recover after difficulties.", "Resilient learners try again after a mistake.", "B2", ["strong", "adaptable"]),
    ("bloom", "/bluːm/", "verb", "To produce flowers or develop successfully.", "With regular practice, your confidence will bloom.", "B1", ["flourish", "blossom"]),
    ("kind", "/kaɪnd/", "adjective", "Friendly, generous, and caring toward others.", "A kind classmate helped me with my homework.", "A1", ["caring", "generous"]),
    ("gather", "/ˈɡæðər/", "verb", "To bring people or things together.", "We gather in the library every Friday.", "B1", ["collect", "assemble"]),
    ("purpose", "/ˈpɜːrpəs/", "noun", "The reason for which something is done.", "The purpose of this game is to practise vocabulary.", "B1", ["aim", "intention"]),
    ("bright", "/braɪt/", "adjective", "Full of light, or showing intelligence.", "It was a bright morning in the city.", "A1", ["shining", "clever"]),
    ("wander", "/ˈwɒndər/", "verb", "To walk around without a fixed destination.", "We like to wander through the old town.", "B1", ["roam", "stroll"]),
    ("improve", "/ɪmˈpruːv/", "verb", "To become better or make something better.", "Reading every day will improve your vocabulary.", "A2", ["develop", "enhance"]),
    ("achieve", "/əˈtʃiːv/", "verb", "To succeed in reaching a goal through effort.", "You can achieve your goal with steady practice.", "B1", ["accomplish", "attain"]),
    ("borrow", "/ˈbɒrəʊ/", "verb", "To take something with the intention of returning it.", "May I borrow your dictionary?", "A2", ["take on loan"]),
    ("delight", "/dɪˈlaɪt/", "noun", "A feeling of great pleasure.", "She read the letter with delight.", "B2", ["joy", "pleasure"]),
    ("essential", "/ɪˈsenʃəl/", "adjective", "Completely necessary or very important.", "Water is essential for life.", "B1", ["necessary", "vital"]),
    ("quiet", "/ˈkwaɪət/", "adjective", "Making little or no noise.", "Please find a quiet place to read.", "A1", ["silent", "peaceful"]),
    ("explore", "/ɪkˈsplɔːr/", "verb", "To travel through or examine a place to learn about it.", "Let us explore a new neighbourhood.", "A2", ["investigate", "discover"]),
    ("thoughtful", "/ˈθɔːtfəl/", "adjective", "Showing care for the needs of other people.", "It was thoughtful of you to bring an extra book.", "B2", ["considerate", "caring"]),
    ("habit", "/ˈhæbɪt/", "noun", "Something you do regularly, often without thinking.", "Learning five words each morning is a useful habit.", "A2", ["routine", "practice"]),
    ("perspective", "/pərˈspektɪv/", "noun", "A particular way of considering something.", "Travel can give you a new perspective.", "C1", ["viewpoint", "outlook"]),
    ("hello", "/həˈləʊ/", "exclamation", "A greeting used when you meet someone.", "Hello! It is nice to meet you.", "A1", ["hi"]),
    ("friend", "/frend/", "noun", "A person you know well and enjoy spending time with.", "My friend and I study together.", "A1", ["companion"]),
    ("listen", "/ˈlɪsən/", "verb", "To pay attention to a sound.", "Listen carefully to the conversation.", "A1", ["hear", "pay attention"]),
    ("eloquent", "/ˈeləkwənt/", "adjective", "Able to express ideas clearly and effectively.", "The speaker gave an eloquent explanation.", "C1", ["articulate", "expressive"]),
]

books = []
for i, (title, subtitle, level, color, category, description) in enumerate([
    ("Everyday English", "Small conversations, big connections", "A1", "peach", "General English", "Build confidence in the conversations that happen every day, from introductions to ordering a coffee."),
    ("The Open Road", "English for your next adventure", "A2", "mint", "Travel", "Explore the language of travel through original dialogues, practical phrases, and listening activities."),
    ("Words in Bloom", "Grow a richer vocabulary", "B1", "lavender", "Vocabulary", "Make new words your own with memorable examples, themed word lists, and guided practice."),
    ("A World of Stories", "Read, imagine, discover", "B1", "blue", "Reading", "Find your next favourite story and practise reading for meaning, detail, and new perspectives."),
    ("Speak Your Mind", "Ideas worth sharing", "B2", "yellow", "Speaking", "Express your opinions clearly and thoughtfully through discussion prompts and speaking tasks."),
    ("Beyond the Everyday", "Language with a little more depth", "C1", "rose", "Advanced", "Explore nuanced ideas and sharpen your command of advanced vocabulary and natural expression."),
]):
    books.append({"id": title.lower().replace(" ", "-"), "title": title, "subtitle": subtitle, "level": level, "color": color, "category": category, "description": description, "resources": [{"id": "welcome", "title": "A new beginning", "kind": "audio", "file": "sample-dialogue.wav", "duration": "0:22", "unit": "Unit 1", "transcript": "Hello! Welcome to your English class. My name is Alex. I am curious about the world, and I love learning new things. Today, we will start a new journey together. Listen carefully, ask questions, and be kind to your classmates. A little practice every day makes a big difference. Let us begin."}] if i < 3 else []})

lessons = [
    {"id": "small-talk", "title": "The art of small talk", "description": "Turn a simple hello into a real conversation.", "level": "A1", "category": "Speaking", "minutes": 6, "sections": [{"title": "Start with something you share", "body": "Small talk helps people feel comfortable. Start with the place you are in, the weather, or an activity you share. Try saying 'This is a lovely classroom' or 'How was your weekend?'"}, {"title": "Keep the conversation going", "body": "Ask an open question. Instead of 'Do you like books?', try 'What kind of books do you enjoy?' Listen to the answer and ask one more question. Share a little about yourself too."}, {"title": "Try it with a partner", "body": "Say hello to a classmate. Ask about their favourite food, a place they want to visit, or something they did yesterday. Spend two minutes listening before you switch roles."}], "question": "Which question is most likely to start a longer conversation?", "options": ["Are you tired?", "What do you enjoy doing after class?", "Is this your pen?"], "answer": 1, "explanation": "An open question invites the other person to share more than a yes or no answer."},
    {"id": "present-simple", "title": "Everyday habits, simple sentences", "description": "Talk about the things you do, day after day.", "level": "A1", "category": "Grammar", "minutes": 8, "sections": [{"title": "Meet the present simple", "body": "Use the present simple for habits and facts. 'I walk to school.' 'They study English.' With he, she, and it, add -s or -es. 'She reads every morning.' 'He watches films.'"}, {"title": "Questions and negatives", "body": "Use do or does to ask a question. 'Do you like music?' 'Does she play tennis?' Use do not or does not for a negative. 'I do not drink coffee.' After does, use the base verb without -s."}], "question": "Choose the correct sentence.", "options": ["She walk to school.", "She walks to school.", "She walking to school."], "answer": 1, "explanation": "With she, add -s to the verb in the present simple."},
    {"id": "travel-phrases", "title": "Your next stop", "description": "Useful phrases for finding your way in a new city.", "level": "A2", "category": "Vocabulary", "minutes": 7, "sections": [{"title": "Ask for directions", "body": "Begin politely. 'Excuse me, could you tell me how to get to the station?' Useful direction words include straight ahead, turn left, turn right, next to, and opposite."}, {"title": "Check you understood", "body": "Repeat the key information. 'So I turn left at the cafe?' If you need help, say 'Could you repeat that, please?' Thank the person before you leave."}], "question": "What does 'opposite the library' mean?", "options": ["Inside the library", "Across from the library", "Far away from the library"], "answer": 1, "explanation": "Opposite means on the other side, facing something."},
    {"id": "reading-between-lines", "title": "Reading between the lines", "description": "Find the meaning that a writer leaves unsaid.", "level": "B1", "category": "Reading", "minutes": 10, "sections": [{"title": "Look for clues", "body": "Writers do not always tell you everything directly. Read this sentence. 'Mia looked at the dark clouds and put an umbrella in her bag.' We can infer that Mia thinks it might rain."}, {"title": "Use evidence", "body": "An inference is a conclusion based on clues. It is different from a random guess. Look for actions, descriptions, and word choices that support your idea. Ask yourself what you know and what the text shows."}], "question": "'Leo checked his watch three times while waiting.' What can you infer?", "options": ["Leo is probably impatient or worried about time.", "Leo has three watches.", "Leo is learning to tell time."], "answer": 0, "explanation": "Repeatedly checking a watch suggests that time matters to Leo in this moment."},
    {"id": "giving-opinions", "title": "Make your point", "description": "Share an opinion and support it with a reason.", "level": "B2", "category": "Speaking", "minutes": 8, "sections": [{"title": "Say what you think", "body": "Try phrases such as 'In my view', 'I would argue that', and 'From my perspective'. Then give a clear reason. 'In my view, reading fiction is valuable because it helps us understand other people.'"}, {"title": "Disagree thoughtfully", "body": "Show that you heard the other person's idea. 'I see your point, but I think...' or 'That is an interesting argument. Have you considered...?' A good discussion helps both people learn."}], "question": "Which phrase introduces a respectful disagreement?", "options": ["That makes no sense.", "You are completely wrong.", "I see your point, but I think..."], "answer": 2, "explanation": "Acknowledging the other person's point helps keep the discussion respectful."},
    {"id": "word-families", "title": "One word, many possibilities", "description": "Build your vocabulary through word families.", "level": "B1", "category": "Vocabulary", "minutes": 5, "sections": [{"title": "Meet a word family", "body": "Words often belong to a family. Think of create, creative, creativity, and creation. They share a central meaning, but their roles in a sentence differ. Create is a verb. Creative is an adjective. Creativity and creation are nouns."}, {"title": "Notice the ending", "body": "Endings can give you clues. Many nouns end in -tion or -ity. Many adjectives end in -ful or -ive. Learn a word with its family and write one sentence for each form."}], "question": "Which word is an adjective?", "options": ["Creativity", "Create", "Creative"], "answer": 2, "explanation": "Creative describes a person or thing, so it is an adjective."},
]

books[0]["resources"].extend([
    {"id": "greetings-video", "title": "Start with hello", "kind": "video", "file": "greetings.mp4", "captions": "greetings.vtt", "duration": "0:12", "unit": "Unit 1", "transcript": "Hello. A new conversation starts here.\nHow are you today?\nI am well. Thank you for asking."},
    {"id": "greetings-reading", "title": "Your first conversation", "kind": "pdf", "file": "greetings.pdf", "duration": "1 page", "unit": "Unit 1"},
])

pack = {"version": 1, "words": [dict(id=w[0], word=w[0], phonetic=w[1], part=w[2], definition=w[3], example=w[4], level=w[5], synonyms=w[6]) for w in words], "books": books, "lessons": lessons}
pack["lessons"].extend(json.loads((ROOT / "src/content/lessons.json").read_text(encoding="utf-8")))

for vocabulary in sorted((ROOT / "src/content/vocabulary").glob("*.json")):
    pack["words"].extend(json.loads(vocabulary.read_text(encoding="utf-8")))

for collection in ("words", "books", "lessons"):
    ids = [entry["id"] for entry in pack[collection]]
    if len(ids) != len(set(ids)):
        raise ValueError(f"Duplicate IDs in {collection}")

(ROOT / "src/content").mkdir(parents=True, exist_ok=True)
(ROOT / "src/content/starter.json").write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
