import {Router} from 'express'
import {string, z} from 'zod'
import {prisma} from '../lib/prisma'
import { hashPassword, verifyPassword, generateToken, generateRefreshToken } from '../lib/auth'
import { userExists } from '../lib/user'



const router = Router()

// verification with z 
const registerSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(6)
})

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
})


// userExists
// There are several issues with the code below:

// 1. The 'userExists' function is defined after its usage. While hoisting works for function declarations, async/arrow/lambda function expressions are not hoisted. 
// 2. In the registration POST route, the line:
//    const newUser = prisma.user.create({
//      data:{email, name, passwordHash}
//    })
//    is missing 'await', so it does not actually wait for the user to be created in the database.
// 3. Because of missing 'await', 'newUser' is a Promise, so the subsequent check 'if (newUser)' will always be true, regardless of whether the user was actually created.
// 4. The response "return 'new user not defined'" is not a valid HTTP response in an Express route handler; it should use res.status().json() to reply to the client.
// 5. For invalid input, the code is trying to catch a ZodError, but the parsing using registerSchema.parse() is outside the try-catch block, so such errors wouldn't be caught.
// 6. There's a typo: 'return res.status(201).json({message: 'YaYYY User created successfully', ...})' has a casual message and can be more formal.


// How to fix:
// - Use 'await' when calling async database operations.
// - Handle response properly for all return paths.
// - Put schema parsing inside try-catch to handle validation errors.
// - Use proper HTTP status and response formatting.
// - Move helper function definitions before their first usage, or define them as regular function declarations.





// POST /api/auth/reg
router.post('/register', async (req, res)=>{
   
        // check user exists
        
            try{
                const {email, name, password}= registerSchema.parse(req.body)
                if (await userExists(email)){
                    return res.status(401).json({error: 'User already exists please login '})
                }
                // hash password
                const passwordHash = await hashPassword(password)
                // create user      
                const newUser = await prisma.user.create({
                    data:{email, name, passwordHash}
                })             

                if (newUser){
            
                    return res.status(201).json({message: 'YaYYY User created successfully', email: email, name: name})
                }else{
                    return res.status(500).json({error: '........Internal server error..........'})
                }
                
             
        } catch (error){
            if (error instanceof z.ZodError){
                return res.status(400).json({error: 'Invalid input', details: error.message})
            }
            console.error('Registration error:', error)
            return res.status(500).json({error: 'Internal server error'})
        }
}
)


// POST /api/auth/login
router.post('/login', async (req, res)=>{
    try{
        // zod validation
        const {email, password}= loginSchema.parse(req.body)
        // find user
        const user = await prisma.user.findUnique({where: {email: email as string}})
        if (!user){
            return res.status(401).json({error: 'User not found'})
        }
        const match = await verifyPassword(user.passwordHash, password)
        if (!match){ 
            return res.status(401).json({error: 'Invalid login details try again'})
        }
        // Generate token
        const accessToken = await generateToken(user.id)
        const refreshToken = await generateRefreshToken(user.id, accessToken)
        
        // assign refresh token to cookie
        res.cookie(
            'refreshToken', 
            refreshToken, 
            {
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', // 
                maxAge: 7 * 24 * 60 * 60 * 1000}) // 7 days

        return res.status(200).json({message: 'Login successful', user: {
            id: user.id,
            email: user.email, 
            name: user.name
        }})



} catch (error){
    if (error instanceof z.ZodError){
        return res.status(400).json({error: 'Invalid input', details: error.message})
    }
    console.error('Login error:', error)
    return res.status(500).json({error: 'Internal server error'})
}
}
)

export default router