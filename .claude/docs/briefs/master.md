# Product Brief

## Context
The Finchley Foodbank was founded in 2013 and is an ecumenical project of St Mary's Roman Catholic Church in East Finchley, London.

We provide approximately three days of emergency food for people living in financial hardship in the London Borough of Barnet. This is done through two weekly sessions at St Mary's parish centre where clients can choose items of food and toiletries.

## Registration
Clients are interviewed when registering with us in order to ascertain their needs and are required to provide a letter/bill/statement, dated not more than three months from registration date, showing their name and address. We do not require a voucher or referral.

Their identity, address, family size, any special needs and regular appintment slot (day of the week and time) are recorded on paper client registration cards.

## Client verification
When clients come for their appointment, they tell staff their name who verify registration and timeslot by checking the registration cards.

## Problem to solve
The foodbanks client cards easily become disordered, they get dog-eared and have illegible notes added to them over time. Queues form at reception as staff try to verify the client's information.

## Product Needs
A web based client registration system, with a barcode scanner attached to a laptop, would allow staff to register clients, update their records and verify clients with less effort and errors. optionally a video camera attached to the laptop can record an image of the client.

## Users
1. Foodbank Staff:  
    - foodbank staff are trusted and all users can be given the same access to all capabilities.  
    - Every staff member who uses they system whould have their own login details for audit purposes.
    - for each staff member The system should store th

## Use Cases:
1. Client Registration:   
    - A logged in foodbank staff member creates a new client record and captures these
    fields by interviewing the client: 
        - Name
        - Address
        - Number of family members to feed
        - Reason needs foodbank
        - Number of children
        - Ages of children
        - Photo
        - The day and time for the client's regular foodbank appointment
        - Food preferences
            - Gluten Free
            - Halal
            - Vegetarian
            - No cooking facilities
        - The system records:
            - the Foodbank Staff ID
            - the day/time of registration
            - A unique ID for the client
            - an ID used for barcode scanning

2. Client Attendance Verification:
    - A logged in foodbank staff member searches for the client's registration record using:
        - name
        - address
        - barcode scanner
    - If the client record can not be found, they offer to register the client.
    - The following is shown:
        - appointment timeslot
        - food preferences
        - family size
    - The client attendance record is updated
        - Foodbank staff membre who verified attendance
        - Date / time

3. Client Record Update:
    - A logged in foodbank staff member will search for and find an existing client record
    - They will edit any of the fields & then store back to the database
    - An audit record is made for:
        - what changes were made
        - foodbank staff member who made the changes
        - date / time 

4. Staff Member Account Creation
    - Any registered staff member can create a new staff member account
    - The account will hold the following data:
        - name
        - Address
        - mobile number
        - email
        - date staff member account created
        - ID of staff member who created the account

5. Client Record Search
    - A logged in staff member can search for and view all details held about a client
        - All registration information (see 'Client Registration')
        - client attendance record
        - The history of changes to the client's registration information

## UI Guidelines
1. Avoid generic UI design
2. Adopt a minimal design language
    - use the minimum amount of copy that remains easily understood with minimum cognitive effort
    - minimise the screen space taken up by components, maximising 'negative space' in the screen layout
    - maintain a clear hierarchy of information on the screen, 
        - the most important information being most prominent (located towards the centre of the screen, taking up more space, with bolder colours)
        - supporting information in more recessive colours, smaller text sizes, taking up less space
        - no unimportant information of actions on the screen at all
    - use tables, grids with symettry where possible to create a sense of visual cohesion
    - use no more than 3 different text sizes
    - all corner radii should be the same
3. Motion: 
    - Use animations for effects and micro-interactions. 
    - Prioritize CSS-only solutions for HTML. 
    - Use Motion library for React when available. 
    - Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.
4. Backgrounds: 
    - Create atmosphere and depth rather than defaulting to solid colors. 
    - Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.
5. All standard daisy UI themes available for foodbank staff to save as a preference

## System Architecture Requirements
Production:
1. Cloud hosted
2. Containerised postgres database
3. Auth0 for authentication
4. Backend: Go
5. Frontend: Bun, Vite, React, Tailwind, Daisy UI

Development:
1. Local hosted
2. Containerised postgres database
3. Auth0 for authentication
4. backend: Go
5. Frontend: Bun, Vite, React, Tailwind, Daisy UI