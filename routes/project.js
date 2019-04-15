const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();


const { User, Project, Equipment } = require('../models');

router.get('/projectAll', async (req, res) => {
    try {
        /*if (req.user) {
            const { id } = req.user;*/
            const projects = await Project.findAll({
                where: { userId: 1 }
            });
            res.json(projects);
        /*}*/
    } catch (e) {
        console.log(e);
    }
});

router.get('/projectOne/:id', async (req, res) => {
   try {
       /*if (req.user) {
           const userId = req.user.id;
           console.log(userId);*/
           const { id } = req.params;
           const equipment = await Project.findAll({
               where: { userId: 1 },
               include: { model: Equipment }
           });
           console.log(equipment);
           res.json(equipment[id-1]);
       /*}*/
   } catch (e) {
       console.log(e);
   }
});

router.post('/projectOne', async (req, res) => {
    try {
        const { name, description, equipments } = req.body;
        /*if (req.user) {
            const { id } = req.user;*/
            const user = await User.findOne({
                where: { id: 1 }
            });
            const project = await Project.create({
                name, description
            });
            const result = await Promise.all(equipments.map(eq =>
                Equipment.create(eq)));
            await project.addRsps(result);
            await user.addProjects([project]);
            res.json({ success: true });
        /*}*/
    } catch (e) {
        res.json({ success: false });
        console.log(e);
    }
});

router.post('/projectOne/:id', async (req, res) => {
    try {
        const { password } = req.body;
        const { id } = req.params;
        if (req.user) {
            const exUser = await User.findOne({
                where: { id: req.user.id }
            });
            const result = await bcrypt.compare(password, exUser.password);
            if (result) {
                await Project.destroy({
                    where: { id }
                });
                res.json({ success: true });
            } else {
                res.json({ success: false, message: 'Passwords do not match' });
            }
        }
    } catch (e) {
        console.log(e);
    }
});

router.put('/projectOne/:id', async (req, res) => {
    try {
        const { password } = req.body;
        const { id } = req.user;
        const user = await User.findOne({
           where: { id }
        });
        const result = await bcrypt.compare(password, user.password);
        if (result) {
            await Equipment.destroy({
                where: { projectid: id }
            });
            console.log('삭제되었습니다.');
        } else {
            console.log('비밀번호가 일치하지 않습니다.');
        }
    } catch (e) {
        console.log(e);
    }
});

module.exports = router;
