# The teacher's guide and the privacy note. Blocks use the same small markup as the lessons.
from kit import table

SECTIONS = [
('before', 'Before the first session', [
    ('list', [
        'Set up online saving once (see “Online saving and the Google Sheet” below) and type your sections in the Settings tab of the Sheet.',
        'Decide how learners will open the module: the class link, the offline file copied to each device, or the printed workbook. They can mix: work done offline is saved online the next time the device is connected and the learner is signed in.',
        'Open the module once on the devices to be used. It runs in current versions of Chrome, Edge, Firefox and Safari, on computers and phones.',
        'In the first session, show learners how to sign in (the button at the top of every lesson), the list of nine parts, the words with dotted underlines, and the My progress page.']),
]),
('plan', 'Eight-session plan', [
    ('p', 'Each lesson takes two one-hour sessions. A workable pattern is 5 minutes to start, 45 minutes of self-paced work, and 10 minutes to close. Session 1 of each lesson covers Parts 1 to 4 and Readings 1 and 2; Session 2 covers Readings 3 to 5 and Parts 6 to 9.'),
    table('Table 1. The eight sessions', ['Session', 'What learners do', 'Facilitation notes'], [
        ['1. Lesson 1, first half', 'Sign in. Answer What I Know. Count their pulse and make two predictions. Explore the beating heart. Read about the chambers, walls and valves.', 'Do not confirm or correct the predictions: the lesson returns to them in Part 7.'],
        ['2. Lesson 1, second half', 'Step through the cardiac cycle with the heart sounds. Change heart rate and stroke volume. Compare vertebrate hearts. Label the heart. Think again, the task and the Assessment.', 'If many learners are unsure in which phases all four valves are closed, project the cycle in presentation mode and step through it together. In the task, anyone who should not exercise skips that step.'],
        ['3. Lesson 2, first half', 'Try Harvey’s vein test on their own hand. Make two predictions. Read about the three kinds of vessels and the pressure, speed and area along the route.', 'That blood is slowest in the capillaries goes against intuition. Ask learners to explain it to a partner in their own words.'],
        ['4. Lesson 2, second half', 'Change the radius of a vessel. Run the muscle and breathing pumps. Compare transport in plants and animals. Sort vessel features. Think again, the task and the Assessment.', 'In the flow simulation, ask learners to predict the flow before they move the slider.'],
        ['5. Lesson 3, first half', 'Choose one of four models of the path of blood. Follow a red blood cell around the body. Compare the two circuits.', 'Count how many learners choose each model, by a show of hands or on paper. Do not give the answer yet.'],
        ['6. Lesson 3, second half', 'Read about gas exchange and the real color of blood. Predict where blood goes next. Put the path in order. Work out the “what if” cases. Think again, the task and the Assessment.', 'Learners who finish early can trace a new case aloud to a partner, for example a red blood cell that starts in a kidney.'],
        ['7. Lesson 4, first half', 'Make two predictions. Learn what a reading means. Take three readings in the cuff simulation.', 'If a real blood pressure apparatus is available, a short demonstration fits well after Reading 2.'],
        ['8. Lesson 4, second half', 'Run the Blood Pressure Lab. Step through the baroreceptor reflex. Read about hormones, the kidneys and exercise. Sort the changes. Think again, the task and the Assessment.', 'At the end, check the Sheet. Learners who used the module without signing in can show you their My progress page.']]),
]),
('facilitate', 'Facilitation rules', [
    ('list', [
        'Let learners predict without hints. A wrong first answer is useful, because the lesson is built to work on it.',
        'Answer questions about how to use the module. When a learner asks a content question, point to the reading that answers it.',
        'Watch the list of parts: a part with a check mark is finished.',
        'Note the questions that many learners miss on the first try. These are good topics for the closing ten minutes.',
        'Learners who do not finish in class may continue at home, online or offline.']),
]),
('class', 'Using the module with the whole class', [
    ('list', [
        'Select **Presentation mode** under the list of parts. One part fills the screen with larger text. Use the arrow keys or the buttons at the bottom to move between parts, and Esc to leave.',
        'For a prediction question, let learners answer alone first, then discuss in pairs, then count the choices.',
        'For a simulation, ask the class to predict the result before you change a control.',
        '**Real blood colors** switches every diagram in the module from the textbook code (red and blue) to the real colors (bright and dark red). Use it in Lesson 3, Reading 4.']),
]),
('modes', 'Online, offline and on paper', [
    ('list', [
        '**Online:** share the class link. Work is saved on the device and, when the learner is signed in, in your Google Sheet.',
        '**Offline:** copy the offline file, BioInnovate.html, to the device by cable, flash drive or messaging app, and open it in a browser. No connection is needed. If the learner signs in while connected, the work is saved online too, including the work done offline.',
        '**On paper:** open Print the lessons. A blank workbook has writing boxes for the tasks and the answer key at the end, like a printed self-learning module.']),
]),
('completion', 'Completion and the 75 percent mark', [
    ('p', 'The study counts a learner as having used the module if the learner completed at least 75 percent of it. Each lesson has about 48 tracked items, 192 in all. An item is done when the learner:'),
    ('list', [
        'reads a part to its end (each of the nine parts);',
        'answers a question (What I Know, quick checks, practice, Think again and the Assessment), makes a prediction, or checks a common idea;',
        'uses a simulation enough (for example, explores four parts of the heart or steps through all five phases);',
        'checks the activity once, writes the What I Can Do task (at least a few lines), and rates each self-check target.']),
    ('p', 'The answers to the “Try this” questions under the simulations are kept but not counted. The Sheet and the My progress page show the same percentages and the number of questions answered correctly on the first try.'),
]),
('saving', 'Online saving and the Google Sheet', [
    ('p', 'Learners sign in with their section, full name and a 4-digit PIN that they choose. They do not need a Google account. Work is saved on the device at every step and sent to your Sheet a few seconds later. Work done offline is sent when the connection returns. On another device, the learner signs in with the same section, name and PIN and continues where they stopped. A learner can sign out only after the latest work is saved online.'),
    ('h3', 'Setting it up (once, about 10 minutes)'),
    ('steps', [
        'Create a Google Sheet named “BioInnovate Progress”.',
        'Open Extensions › Apps Script, replace the code with the file Code.gs, and save.',
        'Choose the function setup and click Run. Allow the permissions it asks for. This creates the Progress and Settings tabs.',
        'In Settings, type your section names in column A, one per row, starting at A2.',
        'Deploy › New deployment › Web app. Execute as: Me. Who has access: Anyone. Copy the Web app URL; it goes into the module’s settings file.']),
    ('h3', 'Reading the Sheet'),
    table('Table 2. The columns of the Progress tab', ['Column', 'What it shows'], [
        ['A, B', 'Section and name, as the learner typed them the first time. Learners choose the section from your list.'],
        ['C to G', 'Whole-module percentage and the percentage of each lesson.'],
        ['H', 'Questions answered correctly on the first try, across the module.'],
        ['I', '“Yes” when the whole-module percentage is 75 or more.'],
        ['J to L', 'When the learner started, their last activity, and when the work was last saved online.'],
        ['M', 'The PIN, stored only as a scrambled code (a hash). Nobody can read the PIN from it.'],
        ['N to P', 'The learner’s saved work. Do not edit these columns.']]),
    ('h3', 'Common situations'),
    ('list', [
        '**Forgotten PIN:** delete the learner’s cell in column M. Their next sign-in with the same section and name sets a new PIN.',
        '**A misspelled name:** correct it in column B, then delete the cell in column M. The learner signs in with the corrected name and a new PIN.',
        '**Shared computers:** ask learners to sign out before they leave, so the next learner starts fresh.',
        '**You may sort and filter** the Progress tab. Each learner’s row is found by section and name, not by position.',
        '**Changing the script later:** use Deploy › Manage deployments › edit › Version: New version, so the URL stays the same.']),
]),
('alignment', 'Alignment with the study', [
    table('Table 3. Lessons, content areas of the conceptual test, and the simulations and activities', ['Lesson', 'Content area', 'Simulations and activities'], [
        ['1. The Heart: A Double Pump', 'Cardiac structure and function', 'Beating heart; cardiac cycle with heart sounds; cardiac output; vertebrate hearts; labeling the heart'],
        ['2. Blood Vessels and Blood Flow', 'Blood vessels and blood flow', 'Vessel walls; pressure, speed and area along the route; radius and flow; muscle and breathing pumps; sorting vessel features'],
        ['3. Two Circuits, One Loop', 'Pulmonary and systemic circulation', 'Four models of circulation; following a red blood cell; gas exchange; real blood colors; putting the path in order'],
        ['4. Blood Pressure and Its Control', 'Blood pressure and its regulation', 'Taking a reading with a cuff; Blood Pressure Lab; baroreceptor reflex; exercise data; sorting changes']]),
    ('p', 'The module and the Cardiovascular Physiology Conceptual Test are separate. None of the test items appears in the module. The module’s questions teach the same concepts through different situations, so the posttest measures understanding and not memory of practiced items.'),
]),
]

PRIVACY = [
    ('h2', 'What is saved'),
    ('list', [
        'Your section and full name, and your PIN stored only as a scrambled code (a hash).',
        'Your answers, your predictions, what you wrote, which parts you finished, and when you started and last worked.']),
    ('h2', 'Where it is kept'),
    ('list', [
        'On your device, in the browser, so you can continue where you stopped, even without internet.',
        'If you sign in, also in your teacher’s Google Sheet. BioInnovate sends your work nowhere else: there is no other database, no advertising, and no tracking. The fonts and pictures come with the module.']),
    ('h2', 'Who can see it'),
    ('list', [
        'Your teacher, who uses it to see how much of the module each learner completed, as part of a study on this module.',
        'Anyone using the same device while you are signed in. On a shared device, sign out when you finish. Signing out removes your work from that device after it is saved online.']),
    ('h2', 'Your choices'),
    ('list', [
        'You can use the module without signing in. Your work then stays on your device only.',
        'You can ask your teacher to correct or delete your row in the Sheet.']),
]
