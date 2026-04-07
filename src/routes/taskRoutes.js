const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');

// POST /tasks - Create task
router.post('/', auth, taskController.createTask);

// GET /tasks - Get tasks
router.get('/', auth, taskController.getTasks);

// GET /tasks/:id - Get single task
router.get('/:id', auth, taskController.getTask);

// PUT /tasks/:id - Update task
router.put('/:id', auth, taskController.updateTask);

// DELETE /tasks/:id - Delete task
router.delete('/:id', auth, taskController.deleteTask);

module.exports = router;
