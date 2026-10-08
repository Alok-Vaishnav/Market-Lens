import { Router } from 'express'
import { getCompany, listCompanies, searchCompanies } from '../controllers/companyController.js'

const router = Router()
router.get('/search', searchCompanies)
router.get('/', listCompanies)
router.get('/:symbol', getCompany)
export default router
